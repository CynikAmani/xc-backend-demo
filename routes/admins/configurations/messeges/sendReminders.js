const db = require('../../../../config/db');
const { sendSMS } = require('../../../../config/twilioService');
const moment = require('moment');

// Function to introduce a delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const sendLoanReminders = async () => {
  try {
    // Get the current date and time
    const now = moment();

    // 1. Query for loans not cleared
    const [loans] = await db.promise().query('SELECT * FROM loans WHERE is_cleared = false');

    for (const loan of loans) {
      const endDate = moment(loan.end_date);
      const daysLeft = endDate.diff(now, 'days');
      const hoursLeft = endDate.diff(now, 'hours') % 24;
      const minutesLeft = endDate.diff(now, 'minutes') % 60;

      // Fetch relevant messages
      const [messages] = await db.promise().query('SELECT * FROM messages WHERE message_type LIKE "%NORMAL%"');
      const [dueDateMessages] = await db.promise().query('SELECT * FROM messages WHERE message_type LIKE "%DUE_DATE%"');
      const [overdueMessages] = await db.promise().query('SELECT * FROM messages WHERE message_type LIKE "%OVER%"');

      // Fetch customer and admin phone numbers
      const [users] = await db.promise().query('SELECT * FROM users WHERE user_id = ? OR user_type LIKE "%root%"', [loan.customer_id]);

      const customer = users.find(user => user.user_id === loan.customer_id);
      const admin = users.find(user => user.user_type.includes('root'));

      // Function to create notification
      const createNotification = async (type, targetUser, content) => {
        await db.promise().query('INSERT INTO notifications (notification_type, target_user, content, date) VALUES (?, ?, ?, ?)', 
          [type, targetUser, content, now.format('YYYY-MM-DD HH:mm:ss')]
        );
      };

      // Determine which reminder to send
      if (daysLeft === 4) {
        // Send 4 days before end date reminder
        const customerMessage = messages.find(msg => msg.target_user === 'customer');
        const adminMessage = messages.find(msg => msg.target_user === 'admin');

        if (customerMessage) {
          const content = `${customerMessage.message} You have ${daysLeft} days ${hoursLeft} hours and ${minutesLeft} minutes left.`;
          // await sendSMS(`+${customer.phone}`, content);
          await createNotification('reminder', loan.customer_id, content);
        }

        // Add delay before sending the next SMS
        await delay(5000); // 5-second delay

        if (adminMessage) {
          const content = `${adminMessage.message} Loan ID: ${loan.loan_id}, Customer Phone: ${customer.phone}`;
          // await sendSMS(`+${admin.phone}`, content);
          await createNotification('reminder', admin.user_id, content);
        }
      } else if (daysLeft === 0) {
        // Send due date reminder
        const customerMessage = dueDateMessages.find(msg => msg.target_user === 'customer');
        const adminMessage = dueDateMessages.find(msg => msg.target_user === 'admin');

        if (customerMessage) {
          const elapsedDays = now.diff(endDate, 'days') * -1;
          const elapsedHours = now.diff(endDate, 'hours') % 24 * -1;
          const elapsedMinutes = now.diff(endDate, 'minutes') % 60 * -1;
          const content = `${customerMessage.message} ${elapsedDays} days, ${elapsedHours} hours, and ${elapsedMinutes} minutes have passed since the due date.`;
          await sendSMS(`+${customer.phone}`, content);
          await createNotification('alert', loan.customer_id, content);
        }

        // Add delay before sending the next SMS
        await delay(200000); // delay

        if (adminMessage) {
          const content = `${adminMessage.message} Loan ID: ${loan.loan_id}, Customer Phone: ${customer.phone}`;
          await sendSMS(`+${admin.phone}`, content);
          await createNotification('alert', admin.user_id, content);
        }
      } else if (now.isAfter(endDate) && now.diff(endDate, 'hours') <= 36) {
        // Send overdue reminder
        const customerMessage = overdueMessages.find(msg => msg.target_user === 'customer');
        const adminMessage = overdueMessages.find(msg => msg.target_user === 'admin');

        if (customerMessage) {
          const overdueHours = now.diff(endDate, 'hours');
          const content = `${customerMessage.message} ${overdueHours} hours have passed since the due date.`;
          await sendSMS(`+${customer.phone}`, content);
          await createNotification('alert', loan.customer_id, content);
        }

        // Add delay before sending the next SMS
        await delay(50000); // 5-second delay

        if (adminMessage) {
          const content = `${adminMessage.message} Loan ID: ${loan.loan_id}, Customer Phone: ${customer.phone}`;
          await sendSMS(`+${admin.phone}`, content);
          await createNotification('alert', admin.user_id, content);
        }

        // Update the status of the loan to 'overdue'
        await db.promise().query('UPDATE loans SET status = "overdue" WHERE loan_id = ?', [loan.loan_id]);
      }
    }
  } catch (error) {
    console.error('Error sending loan reminders:', error);
  }
}

module.exports = { sendLoanReminders };
