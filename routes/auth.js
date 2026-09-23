const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { pool } = require('../config/db');
const { redirectIfAuthed } = require('../middleware/auth');

router.get('/login', redirectIfAuthed, (req, res) => {
  res.render('admin/login', { title: 'Admin Login' });
});

router.post('/login', redirectIfAuthed, async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
    const admin = rows[0];

    if (!admin) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/admin/login');
    }

    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/admin/login');
    }

    req.session.admin = { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
    await pool.query('UPDATE admins SET last_login = NOW() WHERE id = ?', [admin.id]);
    await pool.query(
      'INSERT INTO activity_log (admin_id, action, target_type, details) VALUES (?, ?, ?, ?)',
      [admin.id, 'login', 'admin', `${admin.email} logged in`]
    );

    req.flash('success', `Welcome back, ${admin.name}!`);
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/admin/login');
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

module.exports = router;
