const db = require('../config/db');
const checkSession = require('./checkSession');

const checkAdmin = (req, res, next) => {
  // Use checkSession as middleware
  checkSession(req, res, () => {
    // Middleware has verified that the user is logged in
    const userId = req.session.userId; 

    const query = 'SELECT user_type FROM users WHERE user_id = ?';
    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (results.length === 0 || !(`${results[0].user_type}`.toLowerCase().includes('admin'))) {
        return res.status(403).json({ message: 'Forbidden: Not an admin' });
      }
      next();
    });
  });
};

module.exports = checkAdmin;
