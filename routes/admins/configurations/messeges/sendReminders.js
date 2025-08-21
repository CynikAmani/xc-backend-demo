const { db } = require('../../../../config/db');
const moment = require('moment');
const cron = require('node-cron');

const formatCurrency = amount => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MWK'
  }).format(amount);
};

const formatDate = (dateString) => {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  return new Date(dateString).toLocaleString('en-US', options);
};

const sendLoanReminders = async () => {
  const now = moment();

  db.query('SELECT * FROM loans WHERE is_cleared = false AND status != "overdue"', async (err, loans) => {
    if (err) {
      console.error('Error fetching loans:', err);
      return;
    }

    for (const loan of loans || []) {
      const endDate = moment(loan.end_date);
      const daysLeft = endDate.diff(now, 'days');
      const hoursLeft = endDate.diff(now, 'hours') % 24;
      const minutesLeft = endDate.diff(now, 'minutes') % 60;

      const messages = await new Promise(resolve => {
        db.query('SELECT * FROM messages WHERE message_type LIKE "%NORMAL%"', (err, result) => resolve(result || []));
      });

      const dueDateMessages = await new Promise(resolve => {
        db.query('SELECT * FROM messages WHERE message_type LIKE "%DUE_DATE%"', (err, result) => resolve(result || []));
      });

      const overdueMessages = await new Promise(resolve => {
        db.query('SELECT * FROM messages WHERE message_type LIKE "%OVER%"', (err, result) => resolve(result || []));
      });

      const users = await new Promise(resolve => {
        db.query(
          'SELECT * FROM users WHERE user_id = ? OR user_type LIKE "%root%"',
          [loan.customer_id],
          (err, result) => resolve(result || [])
        );
      });

      const customer = users.find(user => user.user_id === loan.customer_id);
      const admin = users.find(user => user.user_type.includes('root'));

      if (!customer || !admin) continue;

      const createNotification = (type, targetUser, content) => {
        return new Promise(resolve => {
          db.query(
            'INSERT INTO notifications (notification_type, target_user, content, date) VALUES (?, ?, ?, ?)',
            [type, targetUser, content, now.format('YYYY-MM-DD HH:mm:ss')],
            () => resolve()
          );
        });
      };

      if (daysLeft === 4) {
        const customerMessage = messages.find(msg => msg.target_user === 'customer');
        const adminMessage = messages.find(msg => msg.target_user === 'admin');

        if (customerMessage) {
          const content = `${customerMessage.message} 
          You have ${daysLeft} days ${hoursLeft} ${hoursLeft === 1 ? 'hour' : 'hours'} and ${minutesLeft} ${minutesLeft === 1 ? 'minute' : 'minutes'} left. 
          Kindly pay back your loan before due time.
          Best Regards,
          Xander Creditors.`;
          await createNotification('reminder', loan.customer_id, content);
        }

        if (adminMessage) {
          const content = `${adminMessage.message},
          Customer Name: ${customer.fullname},
          Customer Phone: ${customer.phone},
          Loan ID: ${loan.loan_id},
          Best Regards, Xander Creditors`;
          await createNotification('reminder', admin.user_id, content);
        }

      } else if (daysLeft === 0) {
        const customerMessage = dueDateMessages.find(msg => msg.target_user === 'customer');
        const adminMessage = dueDateMessages.find(msg => msg.target_user === 'admin');

        if (customerMessage) {
          const elapsedHours = now.diff(endDate, 'hours') % 24 * -1;
          const elapsedMinutes = now.diff(endDate, 'minutes') % 60 * -1;
          const content = `
          Dear ${customer.fullname},
          Please note that your loan (ID: ${loan.loan_id}) of amount ${formatCurrency(loan.loan_amount)} is due in ${elapsedHours} ${elapsedHours === 1 ? 'hour' : 'hours'} and ${elapsedMinutes} ${elapsedMinutes === 1 ? 'minute' : 'Minutes'}. 
          If payment is not made promptly, legal actions will be initiated.
          Best regards,  
          Xander Creditors.`;
          await createNotification('alert', loan.customer_id, content);
        }

        if (adminMessage) {
          const content = `${adminMessage.message}. This customer has a loan due today. 
          Return Amount: ${formatCurrency(loan.return_amount)}, 
          Customer Name: ${customer.fullname}, 
          Customer Phone: ${customer.phone},
          Best Regards, Xander Creditors`;
          await createNotification('alert', admin.user_id, content);
        }

      } else if (now.isAfter(endDate)) {
        const customerMessage = overdueMessages.find(msg => msg.target_user === 'customer');
        const adminMessage = overdueMessages.find(msg => msg.target_user === 'admin');

        if (customerMessage) {
          const elapsedDays = now.diff(endDate, 'days');
          const elapsedHours = now.diff(endDate, 'hours') % 24;
          const elapsedMinutes = now.diff(endDate, 'minutes') % 60;

          const content = `
          Dear ${customer.fullname}, NOTE that ${elapsedDays} days ${elapsedHours} ${elapsedHours === 1 ? 'hour' : 'hours'} and ${elapsedMinutes} ${elapsedMinutes === 1 ? 'minute' : 'minutes'} have passed since the due time (${formatDate(loan.end_date)}) for your loan (ID: ${loan.loan_id}) of amount ${formatCurrency(loan.loan_amount)}. 
          Due to this, your account has been temporarily blocked. As a result, you will not be able to apply for new loans until your current loan balance is fully settled. 
          Best Regards, 
          Xander Creditors.`;
          await createNotification('alert', loan.customer_id, content);
        }

        if (adminMessage) {
          const content = `${adminMessage.message}. Please be reminded that the loan for this customer remains unpaid. You may consider taking appropriate legal actions to resolve the matter. 
          Return Amount: ${formatCurrency(loan.return_amount)}, 
          Customer Name: ${customer.fullname}, 
          Customer Phone: ${customer.phone},
          Best Regards, Xander Creditors`;
          await createNotification('alert', admin.user_id, content);
        }

        // Update loan status and block this user
        db.query(
          'UPDATE loans SET status = "overdue" WHERE loan_id = ? AND end_date < ?',
          [loan.loan_id, now.format('YYYY-MM-DD HH:mm:ss')],
          () => {
            db.query(
              'UPDATE users SET is_blocked = true WHERE user_id = ?',
              [loan.customer_id],
              () => {}
            );
          }
        );
      }
    }
  });
};

sendLoanReminders();

module.exports = { sendLoanReminders };
