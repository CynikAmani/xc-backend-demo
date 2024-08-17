const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const checkAdmin = require('../../../auth/checkAdmin')

// Route to get all loan types
router.get('/', checkAdmin, (req, res) => {
  const query = 'SELECT loan_type_id AS id, type_name AS loanType FROM loan_types';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.status(200).json(results);
  });
});

module.exports = router;
