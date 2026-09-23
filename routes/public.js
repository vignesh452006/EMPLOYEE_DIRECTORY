const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

const PAGE_SIZE = 9;

async function fetchDirectoryData(query) {
  const search = (query.q || '').trim();
  const department = query.department || '';
  const status = query.status || '';
  const sort = query.sort || 'name_asc';
  const page = Math.max(parseInt(query.page, 10) || 1, 1);

  const where = [];
  const params = [];

  if (search) {
    where.push('(e.full_name LIKE ? OR e.job_title LIKE ? OR e.skills LIKE ? OR e.email LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  if (department) {
    where.push('e.department_id = ?');
    params.push(department);
  }
  if (status) {
    where.push('e.status = ?');
    params.push(status);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sortMap = {
    name_asc: 'e.full_name ASC',
    name_desc: 'e.full_name DESC',
    newest: 'e.hire_date DESC',
    oldest: 'e.hire_date ASC',
  };
  const orderBy = sortMap[sort] || sortMap.name_asc;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM employees e ${whereClause}`,
    params
  );
  const total = countRows[0].total;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * PAGE_SIZE;

  const [employees] = await pool.query(
    `SELECT e.*, d.name AS department_name, d.color AS department_color
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, offset]
  );

  const [departments] = await pool.query('SELECT * FROM departments ORDER BY name ASC');

  return { employees, departments, total, totalPages, safePage, search, department, status, sort };
}

async function fetchInsightsData() {
  const [[{ totalActive }]] = await pool.query(
    "SELECT COUNT(*) AS totalActive FROM employees WHERE status = 'active'"
  );
  const [[{ deptCount }]] = await pool.query('SELECT COUNT(*) AS deptCount FROM departments');
  const [[{ locationCount }]] = await pool.query(
    "SELECT COUNT(DISTINCT location) AS locationCount FROM employees WHERE location IS NOT NULL AND location != ''"
  );
  const [[{ avgTenure }]] = await pool.query(
    `SELECT ROUND(AVG(DATEDIFF(CURDATE(), hire_date) / 365), 1) AS avgTenure
     FROM employees WHERE hire_date IS NOT NULL`
  );
  const [featured] = await pool.query(
    `SELECT e.*, d.name AS department_name, d.color AS department_color
     FROM employees e LEFT JOIN departments d ON d.id = e.department_id
     WHERE e.is_featured = 1 ORDER BY e.created_at DESC LIMIT 8`
  );
  const [deptCounts] = await pool.query(
    `SELECT d.id, d.name, d.color, COUNT(e.id) AS count
     FROM departments d LEFT JOIN employees e ON e.department_id = d.id
     GROUP BY d.id ORDER BY count DESC`
  );
  const [statusCounts] = await pool.query(
    `SELECT status, COUNT(*) AS count FROM employees GROUP BY status`
  );
  const [locationCounts] = await pool.query(
    `SELECT location, COUNT(*) AS count FROM employees
     WHERE location IS NOT NULL AND location != '' GROUP BY location ORDER BY count DESC LIMIT 8`
  );
  return {
    heroStats: {
      total: totalActive,
      departments: deptCount,
      locations: locationCount,
      avgTenure: avgTenure || 0,
    },
    featured,
    deptCounts,
    statusCounts,
    locationCounts,
  };
}

// ---------------------------------------------------------
// HOME — landing page: hero, live stats, spotlight carousel
// ---------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const extras = await fetchInsightsData();
    res.render('home', { title: 'Employee Directory', ...extras });
  } catch (err) {
    console.error(err);
    res.status(500).render('home', {
      title: 'Employee Directory',
      heroStats: { total: 0, departments: 0, locations: 0, avgTenure: 0 },
      featured: [], deptCounts: [], statusCounts: [], locationCounts: [],
      error: 'Could not load the homepage right now.',
    });
  }
});

// ---------------------------------------------------------
// DIRECTORY — searchable, filterable employee grid
// ---------------------------------------------------------
router.get('/directory', async (req, res) => {
  try {
    const data = await fetchDirectoryData(req.query);
    res.render('directory', {
      title: 'Directory',
      ...data,
      view: req.query.view === 'list' ? 'list' : 'grid',
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('directory', {
      title: 'Directory',
      employees: [], departments: [], total: 0, totalPages: 1, safePage: 1,
      search: '', department: '', status: '', sort: 'name_asc', view: 'grid',
      error: 'Could not load the directory right now.',
    });
  }
});

// ---------------------------------------------------------
// INSIGHTS — team analytics: headcount, status mix, locations
// ---------------------------------------------------------
router.get('/insights', async (req, res) => {
  try {
    const extras = await fetchInsightsData();
    res.render('insights', { title: 'Team Insights', ...extras });
  } catch (err) {
    console.error(err);
    res.status(500).render('insights', {
      title: 'Team Insights',
      heroStats: { total: 0, departments: 0, locations: 0, avgTenure: 0 },
      featured: [], deptCounts: [], statusCounts: [], locationCounts: [],
      error: 'Could not load insights right now.',
    });
  }
});

// AJAX endpoint for smooth, no-reload live search/filtering
router.get('/api/employees', async (req, res) => {
  try {
    const data = await fetchDirectoryData(req.query);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch employees' });
  }
});

router.get('/employee/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, d.name AS department_name, d.color AS department_color
       FROM employees e LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.id = ?`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).render('404', { title: 'Not Found' });
    }
    const [related] = await pool.query(
      `SELECT e.* FROM employees e WHERE e.department_id = ? AND e.id != ? LIMIT 4`,
      [rows[0].department_id, req.params.id]
    );
    res.render('employee', { title: rows[0].full_name, employee: rows[0], related });
  } catch (err) {
    console.error(err);
    res.status(500).render('404', { title: 'Error' });
  }
});

// ---------------------------------------------------------
// vCard download (.vcf) — lets visitors save a contact card
// ---------------------------------------------------------
router.get('/employee/:id/vcard', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).send('Employee not found');
    const e = rows[0];

    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${e.full_name}`,
      `TITLE:${e.job_title || ''}`,
      `EMAIL:${e.email}`,
      e.phone ? `TEL:${e.phone}` : '',
      e.location ? `ADR:;;${e.location}` : '',
      'END:VCARD',
    ].filter(Boolean).join('\r\n');

    res.set('Content-Type', 'text/vcard');
    res.set('Content-Disposition', `attachment; filename="${e.full_name.replace(/\s+/g, '_')}.vcf"`);
    res.send(vcard);
  } catch (err) {
    console.error(err);
    res.status(500).send('Could not generate vCard.');
  }
});

// ---------------------------------------------------------
// CSV export — exports the currently filtered employee list
// ---------------------------------------------------------
router.get('/export/csv', async (req, res) => {
  try {
    const search = (req.query.q || '').trim();
    const department = req.query.department || '';
    const status = req.query.status || '';
    const where = [];
    const params = [];
    if (search) {
      where.push('(e.full_name LIKE ? OR e.job_title LIKE ? OR e.skills LIKE ? OR e.email LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    if (department) { where.push('e.department_id = ?'); params.push(department); }
    if (status) { where.push('e.status = ?'); params.push(status); }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT e.full_name, e.email, e.phone, e.job_title, d.name AS department_name,
              e.location, e.status, e.employee_code, e.hire_date
       FROM employees e LEFT JOIN departments d ON d.id = e.department_id
       ${whereClause} ORDER BY e.full_name ASC`,
      params
    );

    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const header = ['Full Name', 'Email', 'Phone', 'Job Title', 'Department', 'Location', 'Status', 'Employee Code', 'Hire Date'];
    const lines = [header.join(',')];
    rows.forEach((r) => {
      lines.push([
        r.full_name, r.email, r.phone, r.job_title, r.department_name,
        r.location, r.status, r.employee_code, r.hire_date,
      ].map(escape).join(','));
    });

    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="employee-directory.csv"');
    res.send(lines.join('\r\n'));
  } catch (err) {
    console.error(err);
    res.status(500).send('Could not export CSV.');
  }
});

module.exports = router;
