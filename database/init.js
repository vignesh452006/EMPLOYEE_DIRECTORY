const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

/**
 * Splits a .sql file into individual statements and runs the ones
 * that are safe to run against an already-selected database
 * (skips CREATE DATABASE / USE, since the pool already targets a DB).
 */
async function runSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => !/^CREATE DATABASE/i.test(s))
    .filter((s) => !/^USE /i.test(s));

  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (err) {
      console.error('Schema statement failed:', err.message);
    }
  }
  console.log('✅  Database schema ensured (tables + seed departments)');
}

async function ensureDefaultAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@company.com';
  const name = process.env.ADMIN_NAME || 'Super Admin';
  const plainPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

  const [rows] = await pool.query('SELECT id FROM admins WHERE email = ?', [email]);
  if (rows.length === 0) {
    const hash = await bcrypt.hash(plainPassword, 10);
    await pool.query(
      'INSERT INTO admins (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, hash, 'super_admin']
    );
    console.log(`✅  Default admin created -> ${email} / ${plainPassword} (change this after first login!)`);
  } else {
    console.log('ℹ️   Admin account already exists, skipping creation');
  }
}

async function initDatabase() {
  await runSchema();
  await ensureDefaultAdmin();
}

module.exports = { initDatabase };
