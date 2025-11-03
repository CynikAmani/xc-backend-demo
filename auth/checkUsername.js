const express = require('express');
const router = express.Router();
const db = require('../config/db');

// POST route to check if user exists
router.post('/', (req, res) => {
  const { username } = req.body;

  // Validate the input
  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  // Query the database to find the user by username using callback
  db.query(
    'SELECT user_id, fullname, email FROM users WHERE user_id = ?',
    [username],
    (err, results) => {
      if (err) {
        console.error('Error checking user:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (results.length === 0) {
        // User does not exist
        return res.status(404).json({ message: 'User not found' });
      }

      // User exists
      const { user_id, fullname, email } = results[0];
      res.status(200).json({
        message: 'User exists',
        user: {
          username: user_id,
          fullname: fullname,
          email: email,
        },
      });
    }
  );
});

module.exports = router;
