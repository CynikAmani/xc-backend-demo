const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const { sendSMS } = require('../config/twilioService');

// POST route to reset the password
router.post('/', async (req, res) => {
  const { username } = req.body
  

  // Validate the input
  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  try {
    // Query the database to find the user by username
    const [results] = await db.promise().query('SELECT * FROM users WHERE user_id = ?', [username]);

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = results[0];

    // Generate a new password
    const newPassword = 'N3wP@$$w0rd44';

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Send the new password via SMS
    const smsMessage = `Your new password is: ${newPassword}`;

    try {
      await sendSMS(`+${user.phone}`, smsMessage);

      // If SMS is sent successfully, update the user's password in the database
      await db.promise().query('UPDATE users SET password = ? WHERE user_id = ?', [hashedPassword, username]);

      // Send a success response
      res.status(200).json({ message: 'Password reset successfully. The new password has been sent to your phone.' });

    } catch (smsError) {
      // If SMS sending fails, respond with a reset failed message
      console.error('Failed to send SMS:', smsError);
      res.status(500).json({ message: 'Unable to reset password at the moment due to technical issues. Please try again later.' });
    }

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
