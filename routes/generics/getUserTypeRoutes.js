const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// Route to get the user type of the logged-in user
router.get('/', (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  }

  const getUserTypeQuery = `
    SELECT user_type
    FROM users
    WHERE user_id = ?
  `;

  db.query(getUserTypeQuery, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user type:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userType = results[0].user_type;
    res.status(200).json({ userType });
  });
});

module.exports = router;
