const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const checkSession = require('../../auth/checkSession');

// Route to get the count of unviewed notifications for the logged-in user
router.get('/', checkSession, (req, res) => {
  const username = req.session.userId; // Get the logged-in user's ID from the session

  if (!username) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const query = `
    SELECT COUNT(*) AS unviewedCount
    FROM notifications
    WHERE target_user = ? AND is_viewed = false
  `;

  db.query(query, [username], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // Send the count of unviewed notifications
    res.status(200).json({
        numNewNotifications: results[0].unviewedCount,
    });
  });
});

module.exports = router;
