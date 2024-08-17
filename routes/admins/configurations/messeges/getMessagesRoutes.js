const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin'); 

// Route to get all messages
router.get('/', checkAdmin, (req, res) => {
  const query = 'SELECT * FROM messages';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // Send the results as a response
    res.status(200).json(results);
  });
});

module.exports = router;
