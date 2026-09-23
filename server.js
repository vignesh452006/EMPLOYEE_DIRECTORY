require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');

const { testConnection } = require('./config/db');
const { initDatabase } = require('./database/init');

const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------
// View engine
// ---------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---------------------------------------------------------
// Middleware
// ---------------------------------------------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
    secure: process.env.NODE_ENV === 'production',
  },
}));
app.use(flash());

// Make flash messages & current admin available in every view
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentAdmin = req.session.admin || null;
  res.locals.currentPath = req.path;
  next();
});

// ---------------------------------------------------------
// Routes
// ---------------------------------------------------------
app.use('/admin', authRoutes);
app.use('/admin', adminRoutes);
app.use('/', publicRoutes);

// Health check endpoint (useful for Railway)
app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }));

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// ---------------------------------------------------------
// Boot
// ---------------------------------------------------------
async function start() {
  await testConnection();
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`🚀  Employee Directory running on port ${PORT}`);
  });
}

start();
