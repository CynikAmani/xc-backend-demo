const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAuth = require('../../../../auth/checkAdmin');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

// Route to renew a loan
router.post('/', checkAuth, (req, res) => {
  const { loanId } = req.body;
  const { userId } = req.session; // handler_id

  if (!loanId) {
    return res.status(400).json({ message: 'Missing loanId' });
  }

  // Fetch loan details
  const fetchLoanQuery = `SELECT * FROM loans WHERE loan_id = ?`;
  db.query(fetchLoanQuery, [loanId], (err, loanResult) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!loanResult || loanResult.length === 0) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const loan = loanResult[0];
    const { customer_id, loan_type_id, loan_amount, return_amount, interest_rate, num_weeks, collateral } = loan;

    // Simulate full repayment
    const paymentId = uuidv4();
    const paymentDate = moment().format('YYYY-MM-DD HH:mm:ss');
    const fullRepaymentQuery = `
      INSERT INTO payments (payment_id, handler_id, loan_id, amount_paid, date_paid)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.query(fullRepaymentQuery, [paymentId, userId, loanId, return_amount, paymentDate], (err) => {
      if (err) {
        console.error('Database insertion error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      // Mark the old loan as cleared
      const clearLoanQuery = `
        UPDATE loans
        SET is_cleared = true, status = 'Repaid'
        WHERE loan_id = ?
      `;
      db.query(clearLoanQuery, [loanId], (err) => {
        if (err) {
          console.error('Database update error:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }

        // Create a new loan with updated start and end dates
        const newLoanId = uuidv4();
        const newStartDate = moment().format('YYYY-MM-DD HH:mm:ss');
        const newEndDate = moment(newStartDate).add(num_weeks, 'weeks').format('YYYY-MM-DD HH:mm:ss');
        const createLoanQuery = `
          INSERT INTO loans (loan_id, customer_id, handler_id, loan_type_id, loan_amount, return_amount, interest_rate, num_weeks, start_date, end_date, status, collateral, is_cleared)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, false)
        `;
        const newLoanValues = [
          newLoanId, customer_id, userId, loan_type_id, loan_amount, return_amount, interest_rate, num_weeks, newStartDate, newEndDate, collateral,
        ];
        db.query(createLoanQuery, newLoanValues, (err) => {
          if (err) {
            console.error('Database insertion error:', err);
            return res.status(500).json({ message: 'Internal server error' });
          }

          // Respond with success message and 200 status
          res.status(200).json({ message: 'Loan renewed successfully' });
        });
      });
    });
  });
});

module.exports = router;
