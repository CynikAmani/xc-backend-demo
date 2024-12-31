const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const moment = require('moment'); // Import moment.js for date formatting
const checkAdmin = require('../../../../auth/checkAdmin');

// Route to get cleared loans with payment installments
router.get('/', checkAdmin, async (req, res) => {
  try {
    // Query to get cleared loans, ordered by the latest payment date (LIFO)
    const loansQuery = `
      SELECT 
        l.loan_id, l.customer_id, l.handler_id, l.loan_type_id, l.loan_amount, l.return_amount, 
        l.interest_rate, l.num_weeks, l.start_date, l.end_date, l.status, l.collateral, l.is_cleared,
        u.fullname AS owner_name,
        (SELECT MAX(p.date_paid) FROM payments p WHERE p.loan_id = l.loan_id) AS latest_payment_date
      FROM loans l
      JOIN users u ON l.customer_id = u.user_id
      WHERE l.is_cleared = true
      ORDER BY latest_payment_date DESC
    `;
    const [loansResult] = await db.promise().query(loansQuery);

    // Fetch all payments for loans in a single query
    const loanIds = loansResult.map(loan => loan.loan_id);
    const paymentsQuery = `
      SELECT 
        p.payment_id, p.loan_id, p.amount_paid, p.date_paid, u.fullname AS handler_name
      FROM payments p
      JOIN users u ON p.handler_id = u.user_id
      WHERE p.loan_id IN (?)
      ORDER BY p.loan_id, p.date_paid ASC
    `;
    const [paymentsResult] = await db.promise().query(paymentsQuery, [loanIds]);

    // Group payments by loan_id for quick lookup
    const paymentsByLoanId = paymentsResult.reduce((acc, payment) => {
      payment.date_paid = moment(payment.date_paid).format('YYYY-MM-DD HH:mm:ss'); // Format date_paid
      if (!acc[payment.loan_id]) {
        acc[payment.loan_id] = [];
      }
      acc[payment.loan_id].push(payment);
      return acc;
    }, {});

    // Build the response
    const clearedLoans = loansResult.map(loan => {
      loan.start_date = moment(loan.start_date).format('YYYY-MM-DD HH:mm:ss'); // Format start_date
      loan.end_date = moment(loan.end_date).format('YYYY-MM-DD HH:mm:ss');     // Format end_date

      return {
        loanDetails: loan,
        payments: paymentsByLoanId[loan.loan_id] || [], // Attach payments or empty array if none
      };
    });

    res.status(200).json(clearedLoans);
  } catch (error) {
    console.error('Error fetching cleared loans:', error);
    res.status(500).json({ message: 'Failed to fetch cleared loans. Please try again later.' });
  }
});

module.exports = router;
