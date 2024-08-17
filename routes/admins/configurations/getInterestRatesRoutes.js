const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const checkAdmin = require('../../../auth/checkAdmin')


// Route to get all interest rates
router.get('/', checkAdmin, (req, res) => {
  const query = `
    SELECT 
      ir.rate_id AS id, 
      lt.type_name AS loanType, 
      ir.num_weeks AS numWeeks,
      ir.normal_rate AS normalRate, 
      ir.overdue_rate AS overdueRate
    FROM 
      interest_rates ir
    JOIN 
      loan_types lt ON ir.loan_type_id = lt.loan_type_id
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.status(200).json(results);
  });
});

module.exports = router;
