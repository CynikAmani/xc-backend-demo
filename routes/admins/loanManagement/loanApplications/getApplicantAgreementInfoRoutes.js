const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkSession = require('../../../../auth/checkSession');
const moment = require('moment'); // Import moment for date calculations

router.post('/', checkSession, (req, res) => {
  const { loanApplicationId, userId } = req.body; // Receive both from the request body

  if (!loanApplicationId || !userId) {
    return res.status(400).json({ message: 'Loan application ID and user ID are required' });
  }

  const query = `
    SELECT 
      la.loan_amount,
      la.collateral,
      la.num_weeks,
      la.date_applied,
      u.fullname,
      u.national_id,
      ar.national_id_img_name,
      ar.signature_data,
      lt.type_name AS loan_type,
      ir.normal_rate AS interest_rate
    FROM loan_applications la
    JOIN users u ON la.applicant_id = u.user_id
    LEFT JOIN agreement_refs ar ON ar.user_id = u.user_id
    JOIN interest_rates ir ON la.num_weeks = ir.num_weeks
    JOIN loan_types lt ON ir.loan_type_id = lt.loan_type_id
    WHERE la.id = ? AND la.applicant_id = ?
  `;

  db.query(query, [loanApplicationId, userId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Loan application not found' });
    }

    // Extract the first result row
    const row = results[0];

    // Calculate the return date using `moment`
    const returnDate = moment(row.date_applied).add(row.num_weeks, 'weeks').format('YYYY-MM-DD');

    const applicationDetails = {
      loanAmount: row.loan_amount,
      collateral: row.collateral,
      dateApplied: row.date_applied,
      numWeeks: row.num_weeks,
      returnDate,
      applicantFullName: row.fullname,
      nationalId: row.national_id,
      nationalIdImageName: row.national_id_img_name,
      signatureData: row.signature_data ? row.signature_data.toString() : null,
      loanType: row.loan_type,
      interestRate: row.interest_rate,
    };

    res.status(200).json(applicationDetails);
  });
});

module.exports = router;
