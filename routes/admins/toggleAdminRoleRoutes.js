const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// Middleware to check if the user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// Apply the authentication middleware
router.use(isAuthenticated);

router.post('/', (req, res) => {
  const { userId } = req.body;

  // Query to get the current user type
  const getUserTypeQuery = 'SELECT user_type FROM users WHERE user_id = ?';
  db.query(getUserTypeQuery, [userId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUserType = results[0].user_type;
    const newUserType = currentUserType === 'admin' ? 'customer' : 'admin';

    // Query to update the user type
    const updateUserTypeQuery = 'UPDATE users SET user_type = ? WHERE user_id = ?';
    db.query(updateUserTypeQuery, [newUserType, userId], (err, result) => {
      if (err) {
        console.error('Database update error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      res.status(200).json({ message: 'User role updated successfully', newUserType });
    });
  });
});

module.exports = router;
