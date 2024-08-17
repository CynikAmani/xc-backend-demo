const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const checkSession = require('../../auth/checkSession');

// Route to delete a notification by ID for the logged-in user
router.delete('/', checkSession, (req, res) => {
  const username = req.session.userId; // Get the logged-in user's ID from the session
  const { notificationId } = req.body; // Extract the notification ID from the request body

  // Validate that notificationId is provided
  if (!notificationId) {
    return res.status(400).json({ message: 'Notification ID is required.' });
  }

  // SQL query to delete the notification if it belongs to the logged-in user
  const query = `
    DELETE FROM notifications 
    WHERE notification_id = ? AND target_user = ?`;

  // Execute the query
  db.query(query, [notificationId, username], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // Check if any rows were affected (i.e., if the notification was deleted)
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found or does not belong to the user.' });
    }

    // Respond with a success message if the notification was deleted
    res.status(200).json({ message: 'Notification deleted successfully.' });
  });
});

module.exports = router;
