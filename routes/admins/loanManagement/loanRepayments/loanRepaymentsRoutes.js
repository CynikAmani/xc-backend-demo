const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAuth = require('../../../../auth/checkAdmin');
const { v4: uuidv4 } = require('uuid'); // For generating unique payment IDs
const moment = require('moment'); // Import moment.js for date formatting


const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MWK'
  }).format(amount);
};


// Route to handle loan repayments
router.post('/', checkAuth, (req, res) => {
  const { loanId, amount } = req.body;
  const { userId } = req.session; // This is the handler_id

  if (!loanId || amount === undefined) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Fetch the return_amount from the loans table
  const loanQuery = 'SELECT return_amount, customer_id FROM loans WHERE loan_id = ?';
  db.query(loanQuery, [loanId], (err, loanResult) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!loanResult || loanResult.length === 0) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const { return_amount, customer_id } = loanResult[0];

    // Calculate the total amount already paid
    const paymentsQuery = 'SELECT SUM(amount_paid) AS total_paid FROM payments WHERE loan_id = ?';
    db.query(paymentsQuery, [loanId], (err, paymentsResult) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      const totalPaid = paymentsResult[0].total_paid || 0;
      const balance = return_amount - totalPaid;

      if (amount > balance) {
        return res.status(400).json({ message: 'The amount to be paid cannot be greater than the remaining balance' });
      }

      // Insert the repayment record
      const paymentId = uuidv4();
      const paymentDate = moment().format('YYYY-MM-DD HH:mm:ss'); // Format the date as 'YYYY-MM-DD HH:mm:ss'
      const insertValues = [paymentId, userId, loanId, amount, paymentDate];
      const insertQuery = `
        INSERT INTO payments (payment_id, handler_id, loan_id, amount_paid, date_paid)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.query(insertQuery, insertValues, (err) => {
        if (err) {
          console.error('Database insertion error:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }

        // Recalculate the new total amount paid after inserting the payment
        db.query(paymentsQuery, [loanId], (err, newPaymentsResult) => {
          if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Internal server error' });
          }

          const newTotalPaid = newPaymentsResult[0].total_paid || 0;
          const newBalance = return_amount - newTotalPaid;

          // Update the loan status if the balance is zero
          if (newBalance === 0) {
            const updateLoanQuery = `UPDATE loans SET is_cleared = true, status = 'Repaid' WHERE loan_id = ?`;
            db.query(updateLoanQuery, [loanId], (err) => {
              if (err) {
                console.error('Database update error:', err);
                return res.status(500).json({ message: 'Internal server error' });
              }

              // Insert notifications after loan repayment is recorded
              insertNotifications(userId, customer_id, loanId, amount, paymentDate, res);

              // Respond with success and new balance
              res.status(201).json({ 
                message: 'Repayment recorded successfully and loan marked as cleared',
                newBalance
              });
            });
          } else {
            // Insert notifications after loan repayment is recorded
            insertNotifications(userId, customer_id, loanId, amount, paymentDate, res);

            // Respond with success and new balance
            res.status(201).json({ 
              message: 'Repayment recorded successfully',
              newBalance
            });
          }
        });
      });
    });
  });
});

// Helper function to insert notifications
function insertNotifications(handlerId, customerId, loanId, amountPaid, paymentDate, res) {
  // Fetch handler and customer details
  const userQuery = 'SELECT fullname FROM users WHERE user_id = ?';
  
  // Fetch handler details
  db.query(userQuery, [handlerId], (err, handlerResult) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    const handlerName = handlerResult[0].fullname;

    // Fetch customer details
    db.query(userQuery, [customerId], (err, customerResult) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      const customerName = customerResult[0].fullname;

      // Fetch root admin details
      const rootAdminQuery = "SELECT user_id FROM users WHERE user_type LIKE '%root%'";
      db.query(rootAdminQuery, (err, rootAdminResult) => {
        if (err) {
          console.error('Database query error:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }

        const rootAdmin = rootAdminResult[0];
        const rootAdminId = rootAdmin ? rootAdmin.user_id : null;

        // Prepare notifications
        const notifications = [
          {
            notification_type: 'info',
            target_user: handlerId,
            content: `You have recorded a payment of ${formatCurrency(amountPaid)} for loan ID ${loanId}.`,
            date: paymentDate
          },
          {
            notification_type: 'info',
            target_user: customerId,
            content: `Dear ${customerName}, a payment of  ${formatCurrency(amountPaid)} has been recorded for your loan ID ${loanId}.`,
            date: paymentDate
          }
        ];

        if (rootAdminId) {
          notifications.push({
            notification_type: 'info',
            target_user: rootAdminId,
            content: `A payment of ${formatCurrency(amountPaid)} has been recorded for loan ID ${loanId}. The operation was performed by ${handlerName}.`,
            date: paymentDate
          });
        }

        // Insert notifications into the database
        const insertNotificationQuery = 'INSERT INTO notifications (notification_type, target_user, content, date) VALUES ?';
        const notificationValues = notifications.map(n => [n.notification_type, n.target_user, n.content, n.date]);

        db.query(insertNotificationQuery, [notificationValues], (err) => {
          if (err) {
            console.error('Database notification insertion error:', err);
            return res.status(500).json({ message: 'Internal server error' });
          }
        });
      });
    });
  });
}

module.exports = router;
