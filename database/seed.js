/**
 * Optional: populates the database with sample employees for demo purposes.
 * Run with: npm run seed
 */
require('dotenv').config();
const { pool } = require('../config/db');
const { initDatabase } = require('./init');

const sampleEmployees = [
  {
    full_name: 'Ava Thompson', email: 'ava.thompson@company.com', phone: '+1 415 555 0142',
    job_title: 'Senior Frontend Engineer', department: 'Engineering', location: 'San Francisco, USA',
    employee_code: 'EMP-1001', status: 'active', hire_date: '2021-03-15',
    skills: 'React, TypeScript, CSS, Accessibility',
    avatar_url: 'https://i.pravatar.cc/300?img=47',
    bio: 'Ava leads the design-system initiative and loves crafting delightful UI interactions.',
    is_featured: 1
  },
  {
    full_name: 'Marcus Chen', email: 'marcus.chen@company.com', phone: '+1 212 555 0193',
    job_title: 'Product Designer', department: 'Design', location: 'New York, USA',
    employee_code: 'EMP-1002', status: 'active', hire_date: '2020-07-01',
    skills: 'Figma, Prototyping, User Research',
    avatar_url: 'https://i.pravatar.cc/300?img=12',
    bio: 'Marcus obsesses over pixel-perfect design and smooth micro-interactions.',
    is_featured: 1
  },
  {
    full_name: 'Priya Sharma', email: 'priya.sharma@company.com', phone: '+91 98765 43210',
    job_title: 'Backend Engineer', department: 'Engineering', location: 'Bengaluru, India',
    employee_code: 'EMP-1003', status: 'active', hire_date: '2022-01-10',
    skills: 'Node.js, MySQL, Docker, AWS',
    avatar_url: 'https://i.pravatar.cc/300?img=32',
    bio: 'Priya builds resilient APIs and mentors junior backend developers.',
    is_featured: 0
  },
  {
    full_name: 'Daniel Okafor', email: 'daniel.okafor@company.com', phone: '+234 803 555 0199',
    job_title: 'Marketing Manager', department: 'Marketing', location: 'Lagos, Nigeria',
    employee_code: 'EMP-1004', status: 'active', hire_date: '2019-11-20',
    skills: 'SEO, Content Strategy, Analytics',
    avatar_url: 'https://i.pravatar.cc/300?img=51',
    bio: 'Daniel drives growth campaigns and brand storytelling across channels.',
    is_featured: 0
  },
  {
    full_name: 'Sofia Rossi', email: 'sofia.rossi@company.com', phone: '+39 348 555 0176',
    job_title: 'HR Business Partner', department: 'Human Resources', location: 'Milan, Italy',
    employee_code: 'EMP-1005', status: 'on_leave', hire_date: '2018-05-05',
    skills: 'Talent Acquisition, Employee Relations',
    avatar_url: 'https://i.pravatar.cc/300?img=25',
    bio: 'Sofia champions employee wellbeing and inclusive hiring practices.',
    is_featured: 0
  },
  {
    full_name: 'James Whitfield', email: 'james.whitfield@company.com', phone: '+44 7700 900123',
    job_title: 'Sales Director', department: 'Sales', location: 'London, UK',
    employee_code: 'EMP-1006', status: 'active', hire_date: '2017-09-12',
    skills: 'Negotiation, CRM, Enterprise Sales',
    avatar_url: 'https://i.pravatar.cc/300?img=15',
    bio: 'James has closed some of the company\'s largest enterprise accounts.',
    is_featured: 1
  },
  {
    full_name: 'Emily Zhang', email: 'emily.zhang@company.com', phone: '+1 646 555 0122',
    job_title: 'Financial Analyst', department: 'Finance', location: 'Toronto, Canada',
    employee_code: 'EMP-1007', status: 'active', hire_date: '2023-02-27',
    skills: 'Financial Modeling, Excel, Forecasting',
    avatar_url: 'https://i.pravatar.cc/300?img=44',
    bio: 'Emily keeps the books balanced and the forecasts sharp.',
    is_featured: 0
  },
  {
    full_name: 'Lucas Martins', email: 'lucas.martins@company.com', phone: '+55 11 95555 0188',
    job_title: 'Operations Lead', department: 'Operations', location: 'São Paulo, Brazil',
    employee_code: 'EMP-1008', status: 'inactive', hire_date: '2016-04-18',
    skills: 'Logistics, Supply Chain, Process Improvement',
    avatar_url: 'https://i.pravatar.cc/300?img=8',
    bio: 'Lucas optimizes workflows so the rest of the company can move fast.',
    is_featured: 0
  }
];

async function seed() {
  await initDatabase();

  const [depts] = await pool.query('SELECT id, name FROM departments');
  const deptMap = Object.fromEntries(depts.map((d) => [d.name, d.id]));

  for (const emp of sampleEmployees) {
    const departmentId = deptMap[emp.department] || null;
    await pool.query(
      `INSERT IGNORE INTO employees
        (full_name, email, phone, job_title, department_id, avatar_url, bio, location,
         employee_code, status, hire_date, skills, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [emp.full_name, emp.email, emp.phone, emp.job_title, departmentId, emp.avatar_url,
        emp.bio, emp.location, emp.employee_code, emp.status, emp.hire_date, emp.skills, emp.is_featured]
    );
  }

  console.log(`✅  Seeded ${sampleEmployees.length} sample employees`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
