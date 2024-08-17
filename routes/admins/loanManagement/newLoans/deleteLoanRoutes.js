const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');


const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MWK'
  }).format(amount);
};

// Route to delete a loan
router.delete('/', checkAdmin, (req, res) => {
  const { loanId } = req.body;
  const { userId } = req.session;

  // First, fetch the customer ID and full name from the loan record before deleting
  const loanQuery = `
    SELECT customer_id, loan_amount FROM loans WHERE loan_id = ?
  `;

  db.query(loanQuery, [loanId], (err, loanResults) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (loanResults.length === 0) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const { customer_id, loan_amount } = loanResults[0];

    // Now delete the loan record
    const deleteQuery = `
      DELETE FROM loans WHERE loan_id = ?
    `;

    db.query(deleteQuery, [loanId], (err, deleteResults) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (deleteResults.affectedRows === 0) {
        return res.status(404).json({ message: 'Loan not found' });
      }

      // Fetch the admin's full name
      const userQuery = 'SELECT fullname FROM users WHERE user_id = ?';

      db.query(userQuery, [userId], (err, adminResults) => {
        if (err) {
          console.error('Database query error:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }

        const adminName = adminResults[0].fullname;

        // Fetch the customer's full name
        db.query(userQuery, [customer_id], (err, customerResults) => {
          if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Internal server error' });
          }

          const customerName = customerResults[0].fullname;

          // Fetch the root admin ID
          const rootAdminQuery = "SELECT user_id FROM users WHERE user_type LIKE '%root%'";
          db.query(rootAdminQuery, (err, rootAdminResults) => {
            if (err) {
              console.error('Database query error:', err);
              return res.status(500).json({ message: 'Internal server error' });
            }

            const rootAdminId = rootAdminResults[0] ? rootAdminResults[0].user_id : null;

            // Prepare notifications
            const notifications = [
              {
                notification_type: 'alert',
                target_user: userId,
                content: `You have successfully deleted a loan of ${formatCurrency(loan_amount)} for ${customerName}.`,
                date: new Date()
              },
              {
                notification_type: 'alert',
                target_user: customer_id,
                content: `Dear ${customerName}, your loan of ${formatCurrency(loan_amount)} has been deleted. should you have queries about this action, please contact us. Thank you.`,
                date: new Date()
              }
            ];

            if (rootAdminId) {
              notifications.push({
                notification_type: 'alert',
                target_user: rootAdminId,
                content: `Admin ${adminName} has deleted a loan of ${formatCurrency(loan_amount)} for customer ${customerName}.`,
                date: new Date()
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

              // Respond with success
              res.status(200).json({ message: 'Loan successfully deleted and notifications sent' });
            });
          });
        });
      });
    });
  });
});

module.exports = router;
