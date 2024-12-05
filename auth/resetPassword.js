const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');

// POST route to reset the password
router.post('/', async (req, res) => {
  const { username } = req.body;

  // Validate the input
  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  try {
    
    // Generate a new password
    const newPassword = 'N3wP@$$w0rd44';

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password in the database
    await db.promise().query('UPDATE users SET password = ? WHERE user_id = ?', [hashedPassword, username]);

    // Respond with username, fullname, and email address
    res.status(200).json({
      message: 'Password reset successfully.',
      newPassword
      
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
