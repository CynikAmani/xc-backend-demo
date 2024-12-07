const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const checkSession = require('../../auth/checkSession');

// Route to mark multiple notifications as viewed
router.put('/', checkSession, (req, res) => {
  const username = req.session.userId;
  const { notificationIds } = req.body;

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return res.status(400).json({ message: 'Invalid request data' });
  }

  const query = `
    UPDATE notifications
    SET is_viewed = true
    WHERE notification_id IN (?) AND target_user = ?`;

  db.query(query, [notificationIds, username], (err, results) => {
    if (err) {
      console.error('Database update error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    res.status(200).json({
      message: `success`,
    });
  });
});

module.exports = router;
