const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');
const moment = require('moment');

// Route to get all loan applications with additional details for admin
router.get('/', checkAdmin, (req, res) => {
  const query = `
    SELECT 
      la.id,
      la.loan_amount,
      la.collateral,
      la.num_weeks,
      la.location,
      la.date_applied,
      la.discount,
      lt.type_name AS loan_type,
      ir.normal_rate AS interest_rate,
      u.user_id AS userId,
      u.fullname AS applicant_name,
      u.phone AS applicant_phone,
      u.email AS applicant_email,
      (SELECT COUNT(*) FROM loans WHERE customer_id = la.applicant_id) AS pastLoans
    FROM loan_applications la
    JOIN interest_rates ir ON la.num_weeks = ir.num_weeks
    JOIN loan_types lt ON ir.loan_type_id = lt.loan_type_id
    JOIN users u ON la.applicant_id = u.user_id
    ORDER BY la.date_applied DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    const formattedResults = results.map((row) => {
      const dateApplied = moment(row.date_applied);
      const now = moment();
      const duration = moment.duration(now.diff(dateApplied));

      const daysElapsed = Math.floor(duration.asDays());
      const hoursElapsed = Math.floor(duration.asHours() % 24);
      const minutesElapsed = Math.floor(duration.asMinutes() % 60);

      const timeElapsed = `${daysElapsed} D : ${hoursElapsed} H : ${minutesElapsed} M`;

      return {
        id: row.id,
        loanAmount: row.loan_amount,
        collateral: row.collateral,
        numWeeks: row.num_weeks,
        location: row.location,
        dateApplied: row.date_applied,
        discount: row.discount,
        loanType: row.loan_type,
        interestRate: row.interest_rate,
        userId: row.userId,
        applicantName: row.applicant_name,
        applicantPhone: row.applicant_phone,
        applicantEmail: row.applicant_email,
        pastLoans: row.pastLoans,
        timeElapsed: timeElapsed,
      };
    });

    res.status(200).json(formattedResults);
  });
});

module.exports = router;
