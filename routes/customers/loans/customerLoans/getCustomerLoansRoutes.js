const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkSession = require('../../../../auth/checkSession');
const moment = require('moment');

// Route to get customer's loans with balance calculation
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

    // Get loan IDs for balance calculation
    const loanIds = loanResults.map(loan => loan.loanId);

    if (loanIds.length === 0) {
      return res.status(200).json([]);
    }

    // Query to fetch total repayments for each loan
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

      // Map repayments to loanId for easy lookup
      const repaymentMap = repaymentResults.reduce((acc, repayment) => {
        acc[repayment.loanId] = repayment.totalRepayment;
        return acc;
      }, {});

      // Calculate the balance and timeRemaining or elapsedSinceDue for each loan
      const formattedLoans = loanResults.map(loan => {
        const totalRepayment = repaymentMap[loan.loanId] || 0;
        const balance = loan.returnAmount - totalRepayment;

        // Calculate duration between endDate and current date
        let duration = moment.duration(moment(loan.endDate).diff(moment()));

        // Initialize timeRemaining and elapsedSinceDue
        let timeRemaining = null;
        let elapsedSinceDue = null;

        if (duration.asMilliseconds() >= 0) {
          // Loan is not overdue: Calculate time remaining
          timeRemaining = {
            days: Math.max(duration.days(), 0),
            hours: Math.max(duration.hours(), 0),
            minutes: Math.max(duration.minutes(), 0),
          };
        } else {
          // Loan is overdue: Calculate elapsed time since due date
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
          timeRemaining: timeRemaining,         // Null if overdue
          elapsedSinceDue: elapsedSinceDue,     // Null if not overdue
          status: loan.status
        };
      });

      res.status(200).json(formattedLoans);
    });
  });
});

module.exports = router;
