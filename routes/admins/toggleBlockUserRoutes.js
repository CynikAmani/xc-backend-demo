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

  // Query to get the current blocked status
  const getBlockedStatusQuery = 'SELECT is_blocked FROM users WHERE user_id = ?';
  db.query(getBlockedStatusQuery, [userId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentBlockedStatus = results[0].is_blocked;
    const newBlockedStatus = !currentBlockedStatus;

    // Query to update the blocked status
    const updateBlockedStatusQuery = 'UPDATE users SET is_blocked = ? WHERE user_id = ?';
    db.query(updateBlockedStatusQuery, [newBlockedStatus, userId], (err, result) => {
      if (err) {
        console.error('Database update error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      res.status(200).json({ message: 'User blocked status updated successfully', newBlockedStatus });
    });
  });
});

module.exports = router;
