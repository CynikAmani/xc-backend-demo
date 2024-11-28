const db = require('../../../../config/db');
const { sendSMS } = require('../../../../config/twilioService');
const moment = require('moment');
const cron = require('node-cron'); // Use node-cron for scheduling jobs

// Function to introduce a delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const sendLoanReminders = () => {
  const now = moment();

  // Query for loans not cleared
  db.promise().query('SELECT * FROM loans WHERE is_cleared = false')
    .then(([loans]) => {
      loans.forEach(loan => {
        const endDate = moment(loan.end_date);
        const daysLeft = endDate.diff(now, 'days');
        const hoursLeft = endDate.diff(now, 'hours') % 24;
        const minutesLeft = endDate.diff(now, 'minutes') % 60;

        // Fetch relevant messages
        db.promise().query('SELECT * FROM messages WHERE message_type LIKE "%NORMAL%"')
          .then(([messages]) => {
            db.promise().query('SELECT * FROM messages WHERE message_type LIKE "%DUE_DATE%"')
              .then(([dueDateMessages]) => {
                db.promise().query('SELECT * FROM messages WHERE message_type LIKE "%OVER%"')
                  .then(([overdueMessages]) => {
                    // Fetch customer and admin phone numbers
                    db.promise().query('SELECT * FROM users WHERE user_id = ? OR user_type LIKE "%root%"', [loan.customer_id])
                      .then(([users]) => {
                        const customer = users.find(user => user.user_id === loan.customer_id);
                        const admin = users.find(user => user.user_type.includes('root'));

                        const createNotification = (type, targetUser, content) => {
                          db.promise().query('INSERT INTO notifications (notification_type, target_user, content, date) VALUES (?, ?, ?, ?)', 
                            [type, targetUser, content, now.format('YYYY-MM-DD HH:mm:ss')]
                          ).catch(err => console.error('Error creating notification:', err));
                        };

                        // Determine which reminder to send
                        if (daysLeft === 4) {
                          // Send 4 days before end date reminder
                          const customerMessage = messages.find(msg => msg.target_user === 'customer');
                          const adminMessage = messages.find(msg => msg.target_user === 'admin');

                          if (customerMessage) {
                            const content = `${customerMessage.message} You have ${daysLeft} days ${hoursLeft} hours and ${minutesLeft} minutes left.`;
                            // Uncomment to send SMS
                            // sendSMS(`+${customer.phone}`, content);
                            createNotification('reminder', loan.customer_id, content);
                          }

                          delay(5000).then(() => {
                            if (adminMessage) {
                              const content = `${adminMessage.message} Loan ID: ${loan.loan_id}, Customer Phone: ${customer.phone}`;
                              // Uncomment to send SMS
                              // sendSMS(`+${admin.phone}`, content);
                              createNotification('reminder', admin.user_id, content);
                            }
                          });

                        } else if (daysLeft === 0) {
                          // Send due date reminder
                          const customerMessage = dueDateMessages.find(msg => msg.target_user === 'customer');
                          const adminMessage = dueDateMessages.find(msg => msg.target_user === 'admin');

                          if (customerMessage) {
                            const elapsedDays = now.diff(endDate, 'days') * -1;
                            const elapsedHours = now.diff(endDate, 'hours') % 24 * -1;
                            const elapsedMinutes = now.diff(endDate, 'minutes') % 60 * -1;
                            const content = `${customerMessage.message} ${elapsedDays} days, ${elapsedHours} hours, and ${elapsedMinutes} minutes have passed since the due date.`;
                            // Uncomment to send SMS
                            // sendSMS(`+${customer.phone}`, content);
                            createNotification('alert', loan.customer_id, content);
                          }

                          delay(200000).then(() => {
                            if (adminMessage) {
                              const content = `${adminMessage.message} Loan ID: ${loan.loan_id}, Customer Phone: ${customer.phone}`;
                              // Uncomment to send SMS
                              // sendSMS(`+${admin.phone}`, content);
                              createNotification('alert', admin.user_id, content);
                            }
                          });

                        } else if (now.isAfter(endDate)) {
                          // **Send overdue reminder and update the loan status immediately**
                          const customerMessage = overdueMessages.find(msg => msg.target_user === 'customer');
                          const adminMessage = overdueMessages.find(msg => msg.target_user === 'admin');

                          if (customerMessage) {
                            const overdueHours = now.diff(endDate, 'hours');
                            const content = `${customerMessage.message} ${overdueHours} hours have passed since the due date.`;
                            // Uncomment to send SMS
                            // sendSMS(`+${customer.phone}`, content);
                            createNotification('alert', loan.customer_id, content);
                          }

                          delay(50000).then(() => {
                            if (adminMessage) {
                              const content = `${adminMessage.message} Loan ID: ${loan.loan_id}, Customer Phone: ${customer.phone}`;
                              // Uncomment to send SMS
                              // sendSMS(`+${admin.phone}`, content);
                              createNotification('alert', admin.user_id, content);
                            }
                          });

                          
                          // **Update the status of the loan to 'overdue' if the due date has passed**
                          db.promise().query(
                            'UPDATE loans SET status = "overdue" WHERE loan_id = ? AND end_date < ?',
                            [loan.loan_id, now.format('YYYY-MM-DD HH:mm:ss')]  // Compare both date and time
                          )
                          .catch(err => console.error('Error updating loan status to overdue:', err));
                        }
                      });
                  });
              });
          });
      });
    })
    .catch(error => {
      console.error('Error sending loan reminders:', error);
    });
};

// Function to schedule the reminder job at 8 AM and execute immediately after server start
sendLoanReminders();

module.exports = { sendLoanReminders };

