const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkSession = require('../../../../auth/checkSession')
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

      // Calculate the balance and timeRemaining for each loan
      const formattedLoans = loanResults.map(loan => {
        const totalRepayment = repaymentMap[loan.loanId] || 0;
        const balance = loan.returnAmount - totalRepayment;

        // Calculate time remaining
        let duration = moment.duration(moment(loan.endDate).diff(moment()));

        // Ensure no negative values for days, hours, and minutes
        const days = Math.max(duration.days(), 0);
        const hours = Math.max(duration.hours(), 0);
        const minutes = Math.max(duration.minutes(), 0);

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
          timeRemaining: { days, hours, minutes },
          status: loan.status
        };
      });

      res.status(200).json(formattedLoans);
    });
  });
});

module.exports = router;
