const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const checkAdmin = require('../../../auth/checkAdmin');

router.post('/', checkAdmin, (req, res) => {
  const { loanTypeId, normalInterestRate, overdueInterestRate, numWeeks, interestRateId } = req.body;

  // Validate required fields
  if (!loanTypeId || !normalInterestRate || !overdueInterestRate || !numWeeks) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Determine whether to insert or update based on the presence of interestRateId
  if (interestRateId) {
    // Update existing interest rate
    const updateQuery = `
      UPDATE interest_rates 
      SET loan_type_id = ?, normal_rate = ?, overdue_rate = ?, num_weeks = ?
      WHERE rate_id = ?
    `;
    db.query(updateQuery, [loanTypeId, normalInterestRate, overdueInterestRate, numWeeks, interestRateId], (err, result) => {
      if (err) {
        console.error('Database update error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.status(200).json({ message: 'Interest rates updated successfully' });
    });
  } else {
    // Insert new interest rate
    const insertQuery = `
      INSERT INTO interest_rates (loan_type_id, normal_rate, overdue_rate, num_weeks) 
      VALUES (?, ?, ?, ?)
    `;
    db.query(insertQuery, [loanTypeId, normalInterestRate, overdueInterestRate, numWeeks], (err, result) => {
      if (err) {
        console.error('Database insertion error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.status(200).json({ message: 'Interest rates added successfully' });
    });
  }
});

module.exports = router;
