const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');
const moment = require('moment');

// Route to get active loans with balance calculation
router.get('/', checkAdmin, (req, res) => {
  const query = `
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
      hu.fullname AS handlerName  -- Get the handler's name
    FROM loans l
    JOIN users u ON l.customer_id = u.user_id
    JOIN loan_types lt ON l.loan_type_id = lt.loan_type_id
    JOIN users hu ON l.handler_id = hu.user_id  -- Join to get the handler's name
    WHERE l.is_cleared = false
    ORDER BY l.end_date
  `;

  db.query(query, (err, loanResults) => {
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

        // Parse loan end date as moment object
        const endDate = moment(loan.endDate);
        const currentDate = moment();

        // Calculate time remaining
        const duration = moment.duration(endDate.diff(currentDate));
        const daysRemaining = Math.max(duration.days(), 0);
        const hoursRemaining = Math.max(duration.hours(), 0);
        const minutesRemaining = Math.max(duration.minutes(), 0);

        // Calculate overdue time if end date is in the past
        const overdueDuration = endDate.isBefore(currentDate) ? moment.duration(currentDate.diff(endDate)) : moment.duration(0);
        const daysOverdue = Math.max(overdueDuration.days(), 0);
        const hoursOverdue = Math.max(overdueDuration.hours(), 0);
        const minutesOverdue = Math.max(overdueDuration.minutes(), 0);

        return {
          loanId: loan.loanId,
          customerId: loan.customerId,
          handlerName: loan.handlerName,  // Return handler's name
          loanTypeName: loan.loanTypeName, // Return the actual loan type name
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
          timeRemaining: { days: daysRemaining, hours: hoursRemaining, minutes: minutesRemaining },
          timeOverdueElapsed: {
            days: daysOverdue,
            hours: hoursOverdue,
            minutes: minutesOverdue
          }
        };
      });

      res.status(200).json(formattedLoans);
    });
  });
});

module.exports = router;
