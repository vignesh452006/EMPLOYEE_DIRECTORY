const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { pool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(requireAuth);

async function logActivity(req, action, targetType, targetId, details) {
  try {
    await pool.query(
      'INSERT INTO activity_log (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.admin.id, action, targetType, targetId || null, details || '']
    );
  } catch (err) {
    console.error('Activity log failed:', err.message);
  }
}

// ---------------------------------------------------------
// Dashboard
// ---------------------------------------------------------
router.get('/dashboard', async (req, res) => {
  try {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM employees');
    const [[{ active }]] = await pool.query("SELECT COUNT(*) AS active FROM employees WHERE status = 'active'");
    const [[{ onLeave }]] = await pool.query("SELECT COUNT(*) AS onLeave FROM employees WHERE status = 'on_leave'");
    const [[{ deptCount }]] = await pool.query('SELECT COUNT(*) AS deptCount FROM departments');
    const [byDept] = await pool.query(
      `SELECT d.name, d.color, COUNT(e.id) AS count
       FROM departments d LEFT JOIN employees e ON e.department_id = d.id
       GROUP BY d.id ORDER BY count DESC`
    );
    const [recent] = await pool.query(
      `SELECT e.*, d.name AS department_name FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       ORDER BY e.created_at DESC LIMIT 5`
    );
    const [activity] = await pool.query(
      `SELECT a.*, ad.name AS admin_name FROM activity_log a
       LEFT JOIN admins ad ON ad.id = a.admin_id
       ORDER BY a.created_at DESC LIMIT 8`
    );

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats: { total, active, onLeave, deptCount },
      byDept, recent, activity,
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load dashboard.');
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats: { total: 0, active: 0, onLeave: 0, deptCount: 0 },
      byDept: [], recent: [], activity: [],
    });
  }
});

// ---------------------------------------------------------
// Employees - List (with search + pagination)
// ---------------------------------------------------------
router.get('/employees', async (req, res) => {
  const search = (req.query.q || '').trim();
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = 10;

  try {
    const where = search
      ? 'WHERE e.full_name LIKE ? OR e.email LIKE ? OR e.job_title LIKE ?'
      : '';
    const params = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM employees e ${where}`, params
    );
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;

    const [employees] = await pool.query(
      `SELECT e.*, d.name AS department_name, d.color AS department_color
       FROM employees e LEFT JOIN departments d ON d.id = e.department_id
       ${where} ORDER BY e.created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.render('admin/employees', {
      title: 'Manage Employees', employees, search, safePage, totalPages, total,
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load employees.');
    res.redirect('/admin/dashboard');
  }
});

// ---------------------------------------------------------
// Employees - New (form)
// ---------------------------------------------------------
router.get('/employees/new', async (req, res) => {
  const [departments] = await pool.query('SELECT * FROM departments ORDER BY name ASC');
  res.render('admin/form', {
    title: 'Add Employee', departments, employee: {}, formAction: '/admin/employees', method: 'POST',
  });
});

// ---------------------------------------------------------
// Employees - Create
// ---------------------------------------------------------
router.post('/employees', upload.single('avatar_file'), async (req, res) => {
  const {
    full_name, email, phone, job_title, department_id, bio, location,
    employee_code, status, hire_date, skills, linkedin_url, github_url,
    twitter_url, is_featured, avatar_url_manual,
  } = req.body;

  try {
    const avatarUrl = req.file
      ? `/uploads/${req.file.filename}`
      : (avatar_url_manual || null);

    const [result] = await pool.query(
      `INSERT INTO employees
        (full_name, email, phone, job_title, department_id, avatar_url, bio, location,
         employee_code, status, hire_date, skills, linkedin_url, github_url, twitter_url, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [full_name, email, phone || null, job_title || null, department_id || null, avatarUrl,
        bio || null, location || null, employee_code || null, status || 'active',
        hire_date || null, skills || null, linkedin_url || null, github_url || null,
        twitter_url || null, is_featured ? 1 : 0]
    );

    await logActivity(req, 'create', 'employee', result.insertId, `Created ${full_name}`);
    req.flash('success', `${full_name} was added successfully.`);
    res.redirect('/admin/employees');
  } catch (err) {
    console.error(err);
    req.flash('error', err.code === 'ER_DUP_ENTRY' ? 'An employee with that email or code already exists.' : 'Could not create employee.');
    res.redirect('/admin/employees/new');
  }
});

// ---------------------------------------------------------
// Employees - Edit (form)
// ---------------------------------------------------------
router.get('/employees/:id/edit', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!rows.length) {
      req.flash('error', 'Employee not found.');
      return res.redirect('/admin/employees');
    }
    const [departments] = await pool.query('SELECT * FROM departments ORDER BY name ASC');
    res.render('admin/form', {
      title: 'Edit Employee', departments, employee: rows[0],
      formAction: `/admin/employees/${req.params.id}?_method=PUT`, method: 'POST',
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load employee.');
    res.redirect('/admin/employees');
  }
});

// ---------------------------------------------------------
// Employees - Update
// ---------------------------------------------------------
router.put('/employees/:id', upload.single('avatar_file'), async (req, res) => {
  const {
    full_name, email, phone, job_title, department_id, bio, location,
    employee_code, status, hire_date, skills, linkedin_url, github_url,
    twitter_url, is_featured, avatar_url_manual,
  } = req.body;

  try {
    let avatarClause = '';
    const params = [
      full_name, email, phone || null, job_title || null, department_id || null,
      bio || null, location || null, employee_code || null, status || 'active',
      hire_date || null, skills || null, linkedin_url || null, github_url || null,
      twitter_url || null, is_featured ? 1 : 0,
    ];

    let avatarUrl = avatar_url_manual || null;
    if (req.file) avatarUrl = `/uploads/${req.file.filename}`;

    await pool.query(
      `UPDATE employees SET
        full_name=?, email=?, phone=?, job_title=?, department_id=?, bio=?, location=?,
        employee_code=?, status=?, hire_date=?, skills=?, linkedin_url=?, github_url=?,
        twitter_url=?, is_featured=?, avatar_url = COALESCE(?, avatar_url)
       WHERE id=?`,
      [...params, avatarUrl, req.params.id]
    );

    await logActivity(req, 'update', 'employee', req.params.id, `Updated ${full_name}`);
    req.flash('success', `${full_name} was updated successfully.`);
    res.redirect('/admin/employees');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not update employee.');
    res.redirect(`/admin/employees/${req.params.id}/edit`);
  }
});

// ---------------------------------------------------------
// Employees - Delete
// ---------------------------------------------------------
router.delete('/employees/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT full_name FROM employees WHERE id = ?', [req.params.id]);
    await pool.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
    await logActivity(req, 'delete', 'employee', req.params.id, `Deleted ${rows[0]?.full_name || 'employee'}`);
    req.flash('success', 'Employee deleted.');
    res.redirect('/admin/employees');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not delete employee.');
    res.redirect('/admin/employees');
  }
});

// ---------------------------------------------------------
// Departments - manage (list + create + delete)
// ---------------------------------------------------------
router.get('/departments', async (req, res) => {
  const [departments] = await pool.query(
    `SELECT d.*, COUNT(e.id) AS employee_count
     FROM departments d LEFT JOIN employees e ON e.department_id = d.id
     GROUP BY d.id ORDER BY d.name ASC`
  );
  res.render('admin/departments', { title: 'Manage Departments', departments });
});

router.post('/departments', async (req, res) => {
  const { name, color } = req.body;
  try {
    await pool.query('INSERT INTO departments (name, color) VALUES (?, ?)', [name, color || '#6366f1']);
    await logActivity(req, 'create', 'department', null, `Created department ${name}`);
    req.flash('success', `Department "${name}" created.`);
  } catch (err) {
    req.flash('error', err.code === 'ER_DUP_ENTRY' ? 'That department already exists.' : 'Could not create department.');
  }
  res.redirect('/admin/departments');
});

router.delete('/departments/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
    await logActivity(req, 'delete', 'department', req.params.id, 'Deleted department');
    req.flash('success', 'Department deleted.');
  } catch (err) {
    req.flash('error', 'Could not delete department.');
  }
  res.redirect('/admin/departments');
});

// ---------------------------------------------------------
// Admin profile / change password
// ---------------------------------------------------------
router.get('/profile', (req, res) => {
  res.render('admin/profile', { title: 'My Profile' });
});

router.post('/profile/password', async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM admins WHERE id = ?', [req.session.admin.id]);
    const admin = rows[0];
    const match = await bcrypt.compare(current_password, admin.password_hash);
    if (!match) {
      req.flash('error', 'Current password is incorrect.');
      return res.redirect('/admin/profile');
    }
    if (new_password !== confirm_password) {
      req.flash('error', 'New passwords do not match.');
      return res.redirect('/admin/profile');
    }
    if (new_password.length < 8) {
      req.flash('error', 'New password must be at least 8 characters.');
      return res.redirect('/admin/profile');
    }
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, admin.id]);
    await logActivity(req, 'update', 'admin', admin.id, 'Changed password');
    req.flash('success', 'Password updated successfully.');
    res.redirect('/admin/profile');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not update password.');
    res.redirect('/admin/profile');
  }
});

// ---------------------------------------------------------
// Activity log (full view)
// ---------------------------------------------------------
router.get('/activity', async (req, res) => {
  const [activity] = await pool.query(
    `SELECT a.*, ad.name AS admin_name FROM activity_log a
     LEFT JOIN admins ad ON ad.id = a.admin_id
     ORDER BY a.created_at DESC LIMIT 100`
  );
  res.render('admin/activity', { title: 'Activity Log', activity });
});

module.exports = router;
