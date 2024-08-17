const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// Route to get the user type of the logged-in user
router.get('/', async (req, res) => {
  try {
    
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }

    // Query to get the user_type for the logged-in user
    const getUserTypeQuery = `
      SELECT user_type
      FROM users
      WHERE user_id = ?
    `;

    // Execute the query
    const [results] = await db.promise().query(getUserTypeQuery, [userId]);


    const userType = results[0].user_type;

    // Respond with the userType
    res.status(200).json({ userType });
  } catch (error) {
    console.error('Error fetching user type:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
