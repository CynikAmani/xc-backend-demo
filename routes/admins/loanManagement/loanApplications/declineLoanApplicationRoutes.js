const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');
const moment = require('moment');

// Route to decline (delete) a loan application
router.delete('/:id', checkAdmin, (req, res) => {
  const { id } = req.params;
  const handlerId = req.session.userId;

  // Fetch the applicant_id from the loan_applications table
  const applicationQuery = 'SELECT applicant_id FROM loan_applications WHERE id = ?';
  db.query(applicationQuery, [id], (err, appResult) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!appResult || appResult.length === 0) {
      return res.status(404).json({ message: 'Loan application not found' });
    }

    const customerId = appResult[0].applicant_id;

    // Fetch handler details
    const handlerQuery = 'SELECT fullname FROM users WHERE user_id = ?';
    db.query(handlerQuery, [handlerId], (err, handlerResult) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (!handlerResult || handlerResult.length === 0) {
        return res.status(404).json({ message: 'Handler not found' });
      }

      const handlerName = handlerResult[0].fullname;

      // Delete the loan application
      const deleteQuery = 'DELETE FROM loan_applications WHERE id = ?';
      db.query(deleteQuery, [id], (err, result) => {
        if (err) {
          console.error('Database deletion error:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Loan application not found' });
        }

        // Handle notifications
        handleNotifications(customerId, handlerId, handlerName, id, res);
      });
    });
  });
});

// Helper function to handle notifications
function handleNotifications(customerId, handlerId, handlerName, applicationId, res) {
  // Fetch customer details
  const customerQuery = 'SELECT fullname FROM users WHERE user_id = ?';
  db.query(customerQuery, [customerId], (err, customerResult) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!customerResult || customerResult.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const { fullname } = customerResult[0];

    // Fetch root admin details
    const rootAdminQuery = "SELECT user_id FROM users WHERE user_type LIKE '%root%'";
    db.query(rootAdminQuery, (err, rootAdminResult) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      const rootAdmin = rootAdminResult[0];
      const rootAdminId = rootAdmin ? rootAdmin.user_id : null;

      // Prepare notification details
      const notificationDate = moment().format('YYYY-MM-DD HH:mm:ss');
      const notifications = [
        {
          notification_type: 'info',
          target_user: customerId,
          content: `Dear ${fullname}, your loan application has been declined. Please contact us for more information.`,
          date: notificationDate
        },
        {
          notification_type: 'info',
          target_user: handlerId,
          content: `You have declined a loan application for ${fullname}.`,
          date: notificationDate
        }
      ];

      if (rootAdminId) {
        notifications.push({
          notification_type: 'info',
          target_user: rootAdminId,
          content: `Loan application has been declined for ${fullname}. The operation was performed by ${handlerName}.`,
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

        res.status(200).json({ message: 'Loan application declined and notifications sent successfully' });
      });
    });
  });
}

module.exports = router;
