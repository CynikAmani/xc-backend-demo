const { sendSMS } = require('../../../../config/twilioService');
const moment = require('moment');
const db = require('../../../../config/db');  // Make sure to include the database connection

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MWK'
  }).format(amount);
};

const calculateReturnAmount = (loanAmount, interestRate) => {
  return loanAmount * (1 + (interestRate / 100));
};

// Function to handle notifications
const handleNotifications = (notifications) => {
  const insertNotificationQuery = 'INSERT INTO notifications (notification_type, target_user, content, date) VALUES ?';
  const notificationValues = notifications.map(n => [n.notification_type, n.target_user, n.content, n.date]);

  db.query(insertNotificationQuery, [notificationValues], (err) => {
    if (err) {
      console.error('Database notification insertion error:', err);
    }
  });
};

// Function to handle sending SMS
const handleSMS = (phoneNumbers, messages) => {
  phoneNumbers.forEach((phoneNumber, index) => {
    sendSMS(phoneNumber, messages[index])
      .then(() => {
        console.log(`SMS sent to ${phoneNumber} successfully`);
      })
      .catch(err => console.error(`Failed to send SMS to ${phoneNumber}:`, err));
  });
};

// Main function to handle notifications and SMS
const handleNotificationsAndSMS = (customerId, customerPhone, fullname, action, loanAmount, handlerFullname) => {
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

  // Fetch root admin details and add notification if needed
  const rootAdminQuery = "SELECT user_id, phone FROM users WHERE user_type LIKE '%root%'";
  db.query(rootAdminQuery, (err, rootAdminResult) => {
    if (err) {
      console.error('Database query error:', err);
      return;
    }

    const rootAdmin = rootAdminResult[0];
    const rootAdminId = rootAdmin ? rootAdmin.user_id : null;
    const rootAdminPhone = rootAdmin ? rootAdmin.phone : null;

    if (rootAdminId) {
      notifications.push({
        notification_type: 'info',
        target_user: rootAdminId,
        content: `Loan ${action} for ${fullname}, identified as ${customerId}. Amount: ${formatCurrency(loanAmount)}. Operation handled by ${handlerFullname}.`,
        date: notificationDate
      });

      const rootAdminSMS = `Loan ${action} for ${fullname} identified as: ${customerId}. Amount: ${formatCurrency(loanAmount)}. Operation handled by ${handlerFullname}.`;

      // Delay sending the SMS to the root admin by 5 minutes (300,000 milliseconds)
      setTimeout(() => {
        handleSMS([`+${rootAdminPhone}`], [rootAdminSMS]);
      }, 300000); // Delay of 5 minutes
    }

    handleNotifications(notifications);

    // Send SMS to customer immediately
    const customerSMS = `Dear ${fullname}, your loan has been ${action}. The loan amount is ${formatCurrency(loanAmount)}. Thank you.`;
    handleSMS([`+${customerPhone}`], [customerSMS]);
  });
};

module.exports = { formatCurrency, calculateReturnAmount, handleNotificationsAndSMS };
