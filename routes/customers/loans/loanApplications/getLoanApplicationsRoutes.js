const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkSession = require('../../../../auth/checkSession')


// Route to get all loan applications with additional details
router.get('/', checkSession, (req, res) => {
  const { userId } = req.session;

  const query = `
    SELECT 
      la.id,
      la.loan_amount,
      la.collateral,
      la.num_weeks,
      la.date_applied,
      la.discount,
      la.location,
      lt.type_name AS loan_type,
      ir.normal_rate AS interest_rate
    FROM loan_applications la
    JOIN interest_rates ir ON la.num_weeks = ir.num_weeks
    JOIN loan_types lt ON ir.loan_type_id = lt.loan_type_id
    WHERE la.applicant_id = ? ORDER BY la.date_applied DESC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    const formattedResults = results.map((row) => ({
      id: row.id,
      loanAmount: row.loan_amount,
      collateral: row.collateral,
      numWeeks: row.num_weeks,
      dateApplied: row.date_applied,
      discount: row.discount,
      loanType: row.loan_type,
      location: row.location,
      interestRate: row.interest_rate,
    }));

    res.status(200).json(formattedResults);
  });
});

module.exports = router;
