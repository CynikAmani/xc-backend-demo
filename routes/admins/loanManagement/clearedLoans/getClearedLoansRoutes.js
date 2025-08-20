const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const moment = require('moment');
const checkAdmin = require('../../../../auth/checkAdmin');

// Route to get cleared loans with payment installments
router.get('/', checkAdmin, (req, res) => {
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

  db.query(loansQuery, (err, loansResult) => {
    if (err) {
      console.error('Error fetching cleared loans:', err);
      return res.status(500).json({ message: 'Failed to fetch cleared loans. Please try again later.' });
    }

    const loanIds = loansResult.map(loan => loan.loan_id);
    if (loanIds.length === 0) {
      return res.status(200).json([]);
    }

    const paymentsQuery = `
      SELECT 
        p.payment_id, p.loan_id, p.amount_paid, p.date_paid, u.fullname AS handler_name
      FROM payments p
      JOIN users u ON p.handler_id = u.user_id
      WHERE p.loan_id IN (?)
      ORDER BY p.loan_id, p.date_paid ASC
    `;

    db.query(paymentsQuery, [loanIds], (err, paymentsResult) => {
      if (err) {
        console.error('Error fetching payments:', err);
        return res.status(500).json({ message: 'Failed to fetch payments.' });
      }

      const paymentsByLoanId = paymentsResult.reduce((acc, payment) => {
        payment.date_paid = moment(payment.date_paid).format('YYYY-MM-DD HH:mm:ss');
        if (!acc[payment.loan_id]) acc[payment.loan_id] = [];
        acc[payment.loan_id].push(payment);
        return acc;
      }, {});

      const clearedLoans = loansResult.map(loan => {
        loan.start_date = moment(loan.start_date).format('YYYY-MM-DD HH:mm:ss');
        loan.end_date = moment(loan.end_date).format('YYYY-MM-DD HH:mm:ss');

        return {
          loanDetails: loan,
          payments: paymentsByLoanId[loan.loan_id] || [],
        };
      });

      res.status(200).json(clearedLoans);
    });
  });
});

module.exports = router;
