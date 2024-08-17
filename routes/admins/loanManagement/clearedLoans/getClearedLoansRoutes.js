const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const moment = require('moment'); // Import moment.js for date formatting
const checkAdmin = require('../../../../auth/checkAdmin')


// Route to get cleared loans with payment installments
router.get('/', checkAdmin, async (req, res) => {
  try {
    // Query to get cleared loans ordered by end_date (LIFO)
    const loansQuery = `
      SELECT 
        l.loan_id, l.customer_id, l.handler_id, l.loan_type_id, l.loan_amount, l.return_amount, 
        l.interest_rate, l.num_weeks, l.start_date, l.end_date, l.status, l.collateral, l.is_cleared,
        u.fullname AS owner_name
      FROM loans l
      JOIN users u ON l.customer_id = u.user_id
      WHERE l.is_cleared = true
      ORDER BY l.end_date DESC
    `;
    const [loansResult] = await db.promise().query(loansQuery);

    const clearedLoans = [];

    for (const loan of loansResult) {
      // Format start_date and end_date
      loan.start_date = moment(loan.start_date).format('YYYY-MM-DD HH:mm:ss');
      loan.end_date = moment(loan.end_date).format('YYYY-MM-DD HH:mm:ss');

      // Query to get payments with handler name for each loan, ordered by date_paid (FIFO)
      const paymentsQuery = `
        SELECT 
          p.payment_id, p.loan_id, p.amount_paid, p.date_paid, u.fullname AS handler_name
        FROM payments p
        JOIN users u ON p.handler_id = u.user_id
        WHERE p.loan_id = ?
        ORDER BY p.date_paid ASC
      `;
      const [paymentsResult] = await db.promise().query(paymentsQuery, [loan.loan_id]);

      // Format date_paid for each payment
      paymentsResult.forEach(payment => {
        payment.date_paid = moment(payment.date_paid).format('YYYY-MM-DD HH:mm:ss');
      });

      clearedLoans.push({
        loanDetails: loan,
        payments: paymentsResult,
      });
    }

    res.status(200).json(clearedLoans);
  } catch (error) {
    console.error('Error fetching cleared loans:', error);
    res.status(500).json({ message: 'Failed to fetch cleared loans. Please try again later.' });
  }
});

module.exports = router;
