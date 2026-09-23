function requireAuth(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  }
  req.flash('error', 'Please log in to access the admin panel.');
  return res.redirect('/admin/login');
}

function redirectIfAuthed(req, res, next) {
  if (req.session && req.session.admin) {
    return res.redirect('/admin/dashboard');
  }
  return next();
}

module.exports = { requireAuth, redirectIfAuthed };
