const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkSession = require('../../../../auth/checkSession');
const moment = require('moment');

// Route to get customer's loans with balance calculation and payment installments
router.get('/', checkSession, (req, res) => {
  const { userId } = req.session;

  const query = `
    SELECT
      l.loan_id AS loanId,
      l.loan_amount AS loanAmount,
      l.return_amount AS returnAmount,
      l.interest_rate AS interestRate,
      l.start_date AS startDate,
      l.end_date AS endDate,
      l.status,
      l.collateral,
      l.num_weeks AS numWeeks,
      l.is_cleared AS isCleared
    FROM loans l
    WHERE l.customer_id = ? ORDER BY l.end_date
  `;

  db.query(query, [userId], (err, loanResults) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    const loanIds = loanResults.map(loan => loan.loanId);

    if (loanIds.length === 0) {
      return res.status(200).json([]);
    }

    const repaymentQuery = `
      SELECT
        loan_id AS loanId,
        SUM(amount_paid) AS totalRepayment
      FROM payments
      WHERE loan_id IN (?)
      GROUP BY loan_id
    `;

    db.query(repaymentQuery, [loanIds], (err, repaymentResults) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      const repaymentMap = repaymentResults.reduce((acc, repayment) => {
        acc[repayment.loanId] = repayment.totalRepayment;
        return acc;
      }, {});

      // Fetch all installments per loan
      const paymentsQuery = `
        SELECT 
          p.payment_id, p.loan_id AS loanId, p.amount_paid, p.date_paid, u.fullname AS handler_name
        FROM payments p
        JOIN users u ON p.handler_id = u.user_id
        WHERE p.loan_id IN (?)
        ORDER BY p.loan_id, p.date_paid ASC
      `;

      db.query(paymentsQuery, [loanIds], (err, paymentsResult) => {
        if (err) {
          console.error('Error fetching payments:', err);
          return res.status(500).json({ message: 'Failed to fetch installments.' });
        }

        const paymentsByLoanId = paymentsResult.reduce((acc, payment) => {
          payment.date_paid = moment(payment.date_paid).format('YYYY-MM-DD HH:mm:ss');
          if (!acc[payment.loanId]) acc[payment.loanId] = [];
          acc[payment.loanId].push(payment);
          return acc;
        }, {});

        // Construct final response
        const formattedLoans = loanResults.map(loan => {
          const totalRepayment = repaymentMap[loan.loanId] || 0;
          const balance = loan.returnAmount - totalRepayment;

          let duration = moment.duration(moment(loan.endDate).diff(moment()));
          let timeRemaining = null;
          let elapsedSinceDue = null;

          if (duration.asMilliseconds() >= 0) {
            timeRemaining = {
              days: Math.max(duration.days(), 0),
              hours: Math.max(duration.hours(), 0),
              minutes: Math.max(duration.minutes(), 0),
            };
          } else {
            duration = moment.duration(moment().diff(moment(loan.endDate)));
            elapsedSinceDue = {
              days: duration.days(),
              hours: duration.hours(),
              minutes: duration.minutes(),
            };
          }

          return {
            loanId: loan.loanId,
            loanAmount: loan.loanAmount,
            numWeeks: loan.numWeeks,
            interestRate: loan.interestRate,
            returnAmount: loan.returnAmount,
            amountPaid: totalRepayment,
            balance: balance,
            collateral: loan.collateral,
            startDate: loan.startDate,
            endDate: loan.endDate,
            timeRemaining,
            elapsedSinceDue,
            status: loan.status,
            payments: paymentsByLoanId[loan.loanId] || [],
          };
        });

        res.status(200).json(formattedLoans);
      });
    });
  });
});

module.exports = router;
