-- Employee Directory Database Schema
-- Run automatically by database/init.js on server boot, or manually via a MySQL client.

CREATE DATABASE IF NOT EXISTS employee_directory
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE employee_directory;

-- ==========================================================
-- Departments
-- ==========================================================
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(20) DEFAULT '#6366f1',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==========================================================
-- Employees
-- ==========================================================
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(30),
  job_title VARCHAR(150),
  department_id INT,
  avatar_url VARCHAR(500),
  bio TEXT,
  location VARCHAR(150),
  employee_code VARCHAR(50) UNIQUE,
  status ENUM('active', 'on_leave', 'inactive') DEFAULT 'active',
  hire_date DATE,
  skills VARCHAR(500),
  linkedin_url VARCHAR(300),
  github_url VARCHAR(300),
  twitter_url VARCHAR(300),
  is_featured TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  INDEX idx_name (full_name),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ==========================================================
-- Admin users (for the admin panel login)
-- ==========================================================
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'admin') DEFAULT 'admin',
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==========================================================
-- Activity log (tracks admin CRUD actions for auditing)
-- ==========================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT,
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id INT,
  details VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==========================================================
-- Seed departments
-- ==========================================================
INSERT IGNORE INTO departments (name, color) VALUES
  ('Engineering', '#6366f1'),
  ('Design', '#ec4899'),
  ('Marketing', '#f59e0b'),
  ('Sales', '#10b981'),
  ('Human Resources', '#8b5cf6'),
  ('Finance', '#0ea5e9'),
  ('Operations', '#ef4444'),
  ('Customer Support', '#14b8a6');
