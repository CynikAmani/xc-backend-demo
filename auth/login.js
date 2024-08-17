const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');

router.post('/', (req, res) => {
  const { userId, password } = req.body;

  // Validate the input
  if (!userId || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Query the database to get the user data
  db.query('SELECT * FROM users WHERE user_id = ?', [userId], async (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'The server is having problems processing your request, please try again later' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Incorrect username or password' });
    }

    const user = results[0];

    // Compare the hashed password
    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        // User authenticated successfully, set the session
        req.session.userId = userId;
        res.status(200).json({ message: 'Login successful' });
      } else {
        // Authentication failed
        res.status(401).json({ message: 'Incorrect username or password' });
      }
    } catch (error) {
      console.error('Error comparing password:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
});

module.exports = router;
