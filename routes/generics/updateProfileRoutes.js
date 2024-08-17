const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Route to update user profile
router.post('/', isAuthenticated, (req, res) => {
  const { username, fullname, genderId, nationalIdNumber, phone, email } = req.body;

  // Validate the input
  if (!username || !fullname || !genderId || !nationalIdNumber || !phone || !email) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Query to update user information
  const updateQuery = `
    UPDATE users
    SET
      fullname = ?,
      gender_id = ?,
      national_id = ?,
      phone = ?,
      email = ?
    WHERE user_id = ?
  `;
  
  const queryParams = [fullname, genderId, nationalIdNumber, phone, email, username];
  
  db.query(updateQuery, queryParams, (err, result) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User profile updated successfully' });
  });
});

module.exports = router;
