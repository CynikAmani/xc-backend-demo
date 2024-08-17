const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');

router.post('/', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  // Validate the input
  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Ensure the user is logged in
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized: No active session found' });
  }

  // Query the database to get the user data based on session userId
  db.query('SELECT * FROM users WHERE user_id = ?', [req.session.userId], async (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    const user = results[0];

    // Compare the current password
    try {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the username and password in the database
      db.query(
        'UPDATE users SET user_id = ?, password = ? WHERE user_id = ?',
        [userId, hashedPassword, req.session.userId],
        (updateErr, updateResults) => {
          if (updateErr) {
            console.error('Error updating user credentials:', updateErr);
            return res.status(500).json({ message: 'Internal server error' });
          }

          // Update the session with the new username
          req.session.userId = userId;

          res.status(200).json({ message: 'Login credentials updated successfully' });
        }
      );
    } catch (error) {
      console.error('Error comparing or hashing password:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
});

module.exports = router;
