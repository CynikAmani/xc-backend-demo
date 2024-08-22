const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const checkAdmin = require('../../../../auth/checkAdmin');
const { sendSMS } = require('../../../../config/twilioService');

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MWK'
  }).format(amount);
};

// Helper function to calculate the return amount
const calculateReturnAmount = (loanAmount, interestRate) => {
  return loanAmount * (1 + (interestRate / 100));
};

// Route to save or update a loan
router.post('/', checkAdmin, (req, res) => {
  const { loanId, customerId, loanAmount, collateral, numWeeks } = req.body;

  if (!customerId || !loanAmount || !collateral || !numWeeks) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Step 1: Check if the user is blocked
  const checkBlockedQuery = 'SELECT is_blocked, phone, fullname FROM users WHERE user_id = ?';
  db.query(checkBlockedQuery, [customerId], (err, userResult) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!userResult || userResult.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { is_blocked, phone: customerPhone, fullname } = userResult[0];
    if (is_blocked) {
      return res.status(404).json({ message: 'This user is blocked and cannot be granted a loan.' });
    }

    // Step 2: Fetch the interest rate and loan type ID from the interest_rates table
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

      // Step 3: Fetch the logged-in admin's full name
      const handlerId = req.session.userId;
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

        if (loanId) {
          // Update existing loan
          const getExistingLoanQuery = 'SELECT start_date FROM loans WHERE loan_id = ?';
          db.query(getExistingLoanQuery, [loanId], (err, loanResult) => {
            if (err) {
              console.error('Database query error:', err);
              return res.status(500).json({ message: 'Internal server error' });
            }

            if (!loanResult || loanResult.length === 0) {
              return res.status(404).json({ message: 'Loan not found' });
            }

            const { start_date } = loanResult[0];
            const updatedEndDate = moment(start_date).add(numWeeks, 'weeks').format('YYYY-MM-DD HH:mm:ss');

            const updateValues = [loanAmount, returnAmount, interestRate, updatedEndDate, collateral, numWeeks, loanId];
            const updateQuery = `
              UPDATE loans
              SET loan_amount = ?, return_amount = ?, interest_rate = ?, end_date = ?, collateral = ?, num_weeks = ?
              WHERE loan_id = ?
            `;
            db.query(updateQuery, updateValues, (err) => {
              if (err) {
                console.error('Database update error:', err);
                return res.status(500).json({ message: 'Internal server error' });
              }

              handleNotificationsAndSMS(customerId, customerPhone, fullname, 'updated', res, req, loanAmount, handlerFullname);
            });
          });
        } else {
          // Create new loan
          const newLoanId = uuidv4();
          const insertValues = [newLoanId, customerId, handlerId, loan_type_id, loanAmount, returnAmount, interestRate, startDate, endDate, numWeeks, 'pending', collateral, false];
          const insertQuery = `
            INSERT INTO loans (loan_id, customer_id, handler_id, loan_type_id, loan_amount, return_amount, interest_rate, start_date, end_date, num_weeks, status, collateral, is_cleared)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          db.query(insertQuery, insertValues, (err) => {
            if (err) {
              console.error('Database insertion error:', err);
              return res.status(500).json({ message: 'Internal server error' });
            }

            handleNotificationsAndSMS(customerId, customerPhone, fullname, 'Granted', res, req, loanAmount, handlerFullname);
          });
        }
      });
    });
  });
});


function handleNotificationsAndSMS(customerId, customerPhone, fullname, action, res, req, loanAmount, handlerFullname) {
  const handlerId = req.session.userId;

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
        content: `Dear ${fullname}, your loan has been ${action}. The loan amount is ${formatCurrency(loanAmount)}. Congratulations`,
        date: notificationDate
      },
      {
        notification_type: 'info',
        target_user: handlerId,
        content: `You have ${action} a loan for ${fullname}, identified as ${customerId}. Amount: ${formatCurrency(loanAmount)}`,
        date: notificationDate
      }
    ];

    if (rootAdminId) {
      notifications.push({
        notification_type: 'info',
        target_user: rootAdminId,
        content: `Loan ${action} for ${fullname}, identified as ${customerId}. Amount: ${formatCurrency(loanAmount)}. Operation handled by ${handlerFullname}.`,
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

      // Send SMS to customer immediately
      const customerSMS = `Dear ${fullname}, your loan has been ${action}. The loan amount is ${formatCurrency(loanAmount)}. Thank you.`;
      sendSMS(`+${customerPhone}`, customerSMS)
        .then(() => {
          console.log('SMS sent to customer successfully');
        })
        .catch(err => console.error('Failed to send SMS to customer:', err));

      // Delay sending the SMS to the root admin by 5 minutes (300,000 milliseconds)
      if (rootAdminPhone) {
        const rootAdminSMS = `Loan ${action} for ${fullname} identified as: ${customerId}. Amount: ${formatCurrency(loanAmount)}. Operation handled by ${handlerFullname}.`;

        setTimeout(() => {
          sendSMS(`+${rootAdminPhone}`, rootAdminSMS)
            .then(() => {
              console.log('SMS sent to root admin successfully');
            })
            .catch(err => console.error('Failed to send SMS to root admin:', err));
        }, 300000); // 5 minutes delay
      }

      // Respond to the client immediately
      res.status(action === 'created' ? 201 : 200).json({ message: `Loan ${action} successfully` });
    });
  });
}



module.exports = router;
