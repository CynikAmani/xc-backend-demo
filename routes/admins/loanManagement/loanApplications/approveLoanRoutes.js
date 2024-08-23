const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const checkAdmin = require('../../../../auth/checkAdmin');
const { sendSMS } = require('../../../../config/twilioService');

// Helper function to calculate the return amount
const calculateReturnAmount = (loanAmount, interestRate) => {
  return loanAmount * (1 + (interestRate / 100));
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MWK'
  }).format(amount);
};

// Route to approve a loan application and create a new loan
router.post('/', checkAdmin, (req, res) => {
  const { loanApplicationId, loanAmount, collateral, numWeeks } = req.body;
  const handlerId = req.session.userId;

  if (!loanApplicationId || !loanAmount || !collateral || !numWeeks) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Fetch the interest rate and loan type ID from the interest_rates table
  const rateQuery = 'SELECT normal_rate, loan_type_id FROM interest_rates WHERE num_weeks = ?';
  db.query(rateQuery, [numWeeks], (err, rateResult) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!rateResult || rateResult.length === 0) {
      return res.status(404).json({ message: 'Interest rate not found for the specified number of weeks' });
    }

    const { normal_rate, loan_type_id } = rateResult[0];
    const interestRate = normal_rate;
    const returnAmount = calculateReturnAmount(loanAmount, interestRate);

    // Calculate the start and end date
    const startDate = moment().format('YYYY-MM-DD HH:mm:ss');
    const endDate = moment().add(numWeeks, 'weeks').format('YYYY-MM-DD HH:mm:ss');

    // Fetch the applicant_id from the loan_applications table
    const applicationQuery = 'SELECT applicant_id FROM loan_applications WHERE id = ?';
    db.query(applicationQuery, [loanApplicationId], (err, appResult) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (!appResult || appResult.length === 0) {
        return res.status(404).json({ message: 'Loan application not found' });
      }

      const customerId = appResult[0].applicant_id;
      const newLoanId = uuidv4();
      const insertValues = [
        newLoanId, customerId, handlerId, loan_type_id, loanAmount, returnAmount,
        interestRate, startDate, endDate, numWeeks, 'pending', collateral, false
      ];

      const insertQuery = `
        INSERT INTO loans (
          loan_id, customer_id, handler_id, loan_type_id, loan_amount, return_amount, 
          interest_rate, start_date, end_date, num_weeks, status, collateral, is_cleared
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(insertQuery, insertValues, (err) => {
        if (err) {
          console.error('Database insertion error:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }

        // After loan approval, delete the loan application
        const deleteQuery = 'DELETE FROM loan_applications WHERE id = ?';
        db.query(deleteQuery, [loanApplicationId], (deleteErr) => {
          if (deleteErr) {
            console.error('Error deleting loan application:', deleteErr);
            return res.status(500).json({ message: 'Internal server error' });
          }

          // Move notification insertion here
          handleNotifications(customerId, loanAmount, handlerId, newLoanId)
            .then(() => {
              // Respond to the client immediately after notifications are inserted
              res.status(201).json({ message: 'Loan approved, created, and loan application deleted successfully', loanId: newLoanId });

              // Handle SMS sending separately (asynchronously)
              // handleSMS(customerId, loanAmount, handlerId, newLoanId);
            })
            .catch((notificationErr) => {
              console.error('Error inserting notifications:', notificationErr);
              res.status(500).json({ message: 'Internal server error' });
            });
        });
      });
    });
  });
});

// Helper function to handle notifications
function handleNotifications(customerId, loanAmount, handlerId, newLoanId) {
  return new Promise((resolve, reject) => {
    // Fetch customer details
    const customerQuery = 'SELECT fullname FROM users WHERE user_id = ?';
    db.query(customerQuery, [customerId], (err, customerResult) => {
      if (err) return reject(err);
      if (!customerResult || customerResult.length === 0) return reject(new Error('Customer not found'));

      const { fullname } = customerResult[0];

      // Fetch the handler's full name
      const handlerQuery = 'SELECT fullname FROM users WHERE user_id = ?';
      db.query(handlerQuery, [handlerId], (err, handlerResult) => {
        if (err) return reject(err);
        if (!handlerResult || handlerResult.length === 0) return reject(new Error('Handler not found'));

        const handlerFullname = handlerResult[0].fullname;

        // Fetch root admin details
        const rootAdminQuery = "SELECT user_id FROM users WHERE user_type LIKE '%root%'";
        db.query(rootAdminQuery, (err, rootAdminResult) => {
          if (err) return reject(err);

          const rootAdminId = rootAdminResult[0]?.user_id;

          // Prepare notification details
          const notificationDate = moment().format('YYYY-MM-DD HH:mm:ss');
          const notifications = [
            {
              notification_type: 'info',
              target_user: customerId,
              content: `Congratulations ${fullname}, your loan application has been approved. Your loan ID is ${newLoanId}. The loan amount is ${formatCurrency(loanAmount)}. Thank you.`,
              date: notificationDate
            },
            {
              notification_type: 'info',
              target_user: handlerId,
              content: `You have approved a loan application for ${fullname}. Loan ID: ${newLoanId}. Amount: ${formatCurrency(loanAmount)}`,
              date: notificationDate
            }
          ];

          if (rootAdminId) {
            notifications.push({
              notification_type: 'info',
              target_user: rootAdminId,
              content: `A loan application for ${fullname} has been approved by ${handlerFullname}. Loan ID: ${newLoanId}. Amount: ${formatCurrency(loanAmount)}`,
              date: notificationDate
            });
          }

          // Insert notifications into the database
          const insertNotificationQuery = 'INSERT INTO notifications (notification_type, target_user, content, date) VALUES ?';
          const notificationValues = notifications.map(n => [n.notification_type, n.target_user, n.content, n.date]);

          db.query(insertNotificationQuery, [notificationValues], (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      });
    });
  });
}

// Helper function to handle SMS sending
function handleSMS(customerId, loanAmount, handlerId, newLoanId) {
  // Fetch customer and admin details
  const customerQuery = 'SELECT fullname, phone FROM users WHERE user_id = ?';
  db.query(customerQuery, [customerId], (err, customerResult) => {
    if (err || !customerResult || customerResult.length === 0) return;

    const { fullname, phone: customerPhone } = customerResult[0];

    const handlerQuery = 'SELECT fullname FROM users WHERE user_id = ?';
    db.query(handlerQuery, [handlerId], (err, handlerResult) => {
      if (err || !handlerResult || handlerResult.length === 0) return;

      const handlerFullname = handlerResult[0].fullname;

      const rootAdminQuery = "SELECT phone FROM users WHERE user_type LIKE '%root%'";
      db.query(rootAdminQuery, (err, rootAdminResult) => {
        const rootAdminPhone = rootAdminResult[0]?.phone;

        // Send SMS to customer
        const customerSMS = `Congratulations ${fullname}, your loan application has been approved. Loan ID: ${newLoanId}. Amount: ${formatCurrency(loanAmount)}. Thank you.`;
        sendSMS(`+${customerPhone}`, customerSMS)
          .catch(err => console.error('Failed to send SMS to customer:', err));

        // Delay 5 minutes and then send SMS to root admin
        if (rootAdminPhone) {
          const rootAdminSMS = `Loan application for ${fullname} has been approved by ${handlerFullname}. Loan ID: ${newLoanId}. Amount: ${formatCurrency(loanAmount)}`;
          setTimeout(() => {
            sendSMS(`+${rootAdminPhone}`, rootAdminSMS)
              .catch(err => console.error('Failed to send SMS to root admin:', err));
          }, 300000); // 5 minutes delay in milliseconds
        }
      });
    });
  });
}

module.exports = router;
