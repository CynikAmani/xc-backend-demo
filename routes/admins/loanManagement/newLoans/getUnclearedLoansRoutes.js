const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');
const moment = require('moment');

// Route to get uncleared loans that have not gone beyond due date
router.get('/', checkAdmin, (req, res) => {
  const { limit = 20, lastId = null } = req.query;

  let query = `
    SELECT
      l.loan_id AS loanId,
      l.customer_id AS customerId,
      l.handler_id AS handlerId,
      l.loan_amount AS loanAmount,
      l.return_amount AS returnAmount,
      l.interest_rate AS interestRate,
      l.start_date AS startDate,
      l.end_date AS endDate,
      l.status,
      l.collateral,
      l.is_cleared AS isCleared,
      l.num_weeks AS numWeeks,
      u.fullname AS customerName,
      lt.type_name AS loanTypeName,
      hu.fullname AS handlerName
    FROM loans l
    JOIN users u ON l.customer_id = u.user_id
    JOIN loan_types lt ON l.loan_type_id = lt.loan_type_id
    JOIN users hu ON l.handler_id = hu.user_id
    WHERE l.is_cleared = false AND l.end_date > NOW()
  `;

  const params = [];

  if (lastId) {
    query += ` AND l.loan_id < ?`;
    params.push(lastId);
  }

  query += ` ORDER BY l.loan_id DESC LIMIT ?`;
  params.push(parseInt(limit));

  db.query(query, params, (err, loanResults) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

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

      const repaymentMap = repaymentResults.reduce((acc, repayment) => {
        acc[repayment.loanId] = repayment.totalRepayment;
        return acc;
      }, {});

      const formattedLoans = loanResults.map(loan => {
        const totalRepayment = repaymentMap[loan.loanId] || 0;
        const balance = loan.returnAmount - totalRepayment;

        const endDate = moment(loan.endDate);
        const currentDate = moment();
        const duration = moment.duration(endDate.diff(currentDate));

        return {
          loanId: loan.loanId,
          customerId: loan.customerId,
          handlerName: loan.handlerName,
          loanTypeName: loan.loanTypeName,
          loanAmount: loan.loanAmount,
          returnAmount: loan.returnAmount,
          interestRate: loan.interestRate,
          startDate: loan.startDate,
          endDate: loan.endDate,
          status: loan.status,
          collateral: loan.collateral,
          isCleared: loan.isCleared,
          numWeeks: loan.numWeeks,
          customerName: loan.customerName,
          balance: balance,
          amountPaid: totalRepayment,
          timeRemaining: {
            days: Math.max(duration.days(), 0),
            hours: Math.max(duration.hours(), 0),
            minutes: Math.max(duration.minutes(), 0)
          }
        };
      });

      res.status(200).json(formattedLoans);
    });
  });
});

module.exports = router;
