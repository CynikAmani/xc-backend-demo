const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  // Check if the user is logged in
  if (req.session.userId) {
    // Destroy the session to log the user out
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      // Clear the session cookie
      res.clearCookie('connect.sid');
      
      // Respond with success message
      return res.status(200).json({ message: 'Logout successful' });
    });
  } else {
    
    // If no session exists, return a message indicating the user was not logged in
    res.status(200).json({ message: 'You are not logged in' });
  }
});

module.exports = router;
