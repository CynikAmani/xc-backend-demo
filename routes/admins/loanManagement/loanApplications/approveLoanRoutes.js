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

        // Delete the approved loan application from the loan_applications table
        const deleteQuery = 'DELETE FROM loan_applications WHERE id = ?';
        db.query(deleteQuery, [loanApplicationId], (err) => {
          if (err) {
            console.error('Database deletion error:', err);
            return res.status(500).json({ message: 'Internal server error' });
          }

          handleNotificationsAndSMS(customerId, loanAmount, collateral, handlerId, newLoanId, res);
        });
      });
    });
  });
});

// Helper function to handle notifications and SMS sending
function handleNotificationsAndSMS(customerId, loanAmount, collateral, handlerId, newLoanId, res) {
  // Fetch customer details
  const customerQuery = 'SELECT fullname, phone FROM users WHERE user_id = ?';
  db.query(customerQuery, [customerId], (err, customerResult) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!customerResult || customerResult.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const { fullname, phone: customerPhone } = customerResult[0];

    // Fetch the handler's full name
    const handlerQuery = 'SELECT fullname FROM users WHERE user_id = ?';
    db.query(handlerQuery, [handlerId], (err, handlerResult) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (!handlerResult || handlerResult.length === 0) {
        return res.status(404).json({ message: 'Handler not found' });
      }

      const handlerFullname = handlerResult[0].fullname;

      // Fetch root admin details
      const rootAdminQuery = "SELECT user_id, phone FROM users WHERE user_type LIKE '%root%'";
      db.query(rootAdminQuery, (err, rootAdminResult) => {
        if (err) {
          console.error('Database query error:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }

        const rootAdmin = rootAdminResult[0];
        const rootAdminId = rootAdmin ? rootAdmin.user_id : null;
        const rootAdminPhone = rootAdmin ? rootAdmin.phone : null;

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
          if (err) {
            console.error('Database notification insertion error:', err);
            return res.status(500).json({ message: 'Internal server error' });
          }

          // Send SMS to customer and root admin with a delay
          const sendCustomerSMS = () => {
            const customerSMS = `Congratulations ${fullname}, your loan application has been approved. Loan ID: ${newLoanId}. Amount: ${formatCurrency(loanAmount)}. Thank you.`;
            return sendSMS(`+${customerPhone}`, customerSMS)
              .catch(err => console.error('Failed to send SMS to customer:', err));
          };

          const sendAdminSMS = () => {
            if (rootAdminPhone) {
              const rootAdminSMS = `Loan application for ${fullname} has been approved by ${handlerFullname}. Loan ID: ${newLoanId}. Amount: ${formatCurrency(loanAmount)}`;
              return sendSMS(`+${rootAdminPhone}`, rootAdminSMS)
                .catch(err => console.error('Failed to send SMS to root admin:', err));
            }
            return Promise.resolve();
          };

          sendCustomerSMS()
            .then(() => {
              // Add a delay of 2 seconds before sending the next SMS
              setTimeout(() => {
                sendAdminSMS()
                  .then(() => {
                    res.status(201).json({ message: 'Loan approved and created successfully', loanId: newLoanId });
                  })
                  .catch(err => {
                    console.error('Error sending SMS to root admin:', err);
                    // Respond with a success status but log the error internally
                    res.status(201).json({ message: 'Loan approved and created successfully', loanId: newLoanId });
                  });
              }, 10000); // 2 seconds delay
            })
            .catch(err => {
              console.error('Error sending SMS to customer:', err);
              // Respond with a success status but log the error internally
              res.status(201).json({ message: 'Loan approved and created successfully', loanId: newLoanId });
            });
        });
      });
    });
  });
}

module.exports = router;
