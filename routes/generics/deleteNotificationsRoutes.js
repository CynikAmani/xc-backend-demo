const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const checkSession = require('../../auth/checkSession');

// Route to delete multiple notifications by IDs for the logged-in user
router.delete('/', checkSession, (req, res) => {
  const username = req.session.userId; // Get the logged-in user's ID from the session
  const { notificationIds } = req.body; // Extract the array of notification IDs from the request body

  // Validate that notificationIds is provided and is an array
  if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
    return res.status(400).json({ message: 'An array of notification IDs is required.' });
  }

  // SQL query to delete the notifications if they belong to the logged-in user
  const query = `
    DELETE FROM notifications 
    WHERE notification_id IN (?) AND target_user = ?`;

  // Execute the query
  db.query(query, [notificationIds, username], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // Check if any rows were affected (i.e., if the notifications were deleted)
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Notifications not found or do not belong to the user.' });
    }

    // Respond with a success message if the notifications were deleted
    res.status(200).json({ message: 'Notifications deleted successfully.' });
  });
});

module.exports = router;
