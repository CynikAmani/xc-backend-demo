const express = require('express');
const db = require('../../../../config/db');
const checkSession = require('../../../../auth/checkSession');

const router = express.Router();


// Route to get all feedback categories
router.get('/', checkSession, (req, res) => {
    // SQL query to fetch all feedback categories
    const query = `
      SELECT id, name, description
      FROM feedback_categories  
    `;
  
    db.query(query, (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
      }
  
      res.status(200).json(results);
    });
  });
  
  module.exports = router;