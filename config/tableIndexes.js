// config/tableIndexes.js
async function createIndexesIfNeeded(db) {
  console.log('Checking and creating indexes if necessary...');
  
  const indexGroups = {
    users: [
      "CREATE INDEX idx_users_email ON users(email)",
      "CREATE INDEX idx_users_phone ON users(phone)",
      "CREATE INDEX idx_users_district ON users(district_id)"
    ],
    messages: [
      "CREATE INDEX idx_messages_target ON messages(target_user)",
      "CREATE INDEX idx_messages_type ON messages(message_type)"
    ],
    notifications: [
      "CREATE INDEX idx_notifications_target ON notifications(target_user)",
      "CREATE INDEX idx_notifications_is_viewed ON notifications(is_viewed)"
    ],
    loan_applications: [
      "CREATE INDEX idx_loan_applications_applicant ON loan_applications(applicant_id)",
      "CREATE INDEX idx_loan_applications_date ON loan_applications(date_applied)"
    ],
    loans: [
      "CREATE INDEX idx_loans_customer ON loans(customer_id)",
      "CREATE INDEX idx_loans_handler ON loans(handler_id)",
      "CREATE INDEX idx_loans_status ON loans(status)",
      "CREATE INDEX idx_loans_end_date ON loans(end_date)"
    ],
    payments: [
      "CREATE INDEX idx_payments_loan ON payments(loan_id)",
      "CREATE INDEX idx_payments_handler ON payments(handler_id)",
      "CREATE INDEX idx_payments_date ON payments(date_paid)"
    ],
    feedbacks: [
      "CREATE INDEX idx_feedbacks_user ON feedbacks(user_id)",
      "CREATE INDEX idx_feedbacks_category ON feedbacks(category_id)",
      "CREATE INDEX idx_feedbacks_seen ON feedbacks(is_seen)"
    ],
    feedback_chats: [
      "CREATE INDEX idx_feedback_chats_feedback ON feedback_chats(feedback_id)",
      "CREATE INDEX idx_feedback_chats_sender ON feedback_chats(sender_id)"
    ]
  };

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const group in indexGroups) {
    for (const query of indexGroups[group]) {
      await new Promise((resolve) => {
        db.query(query, (err) => {
          if (err) {
            if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_DUP_INDEX') {
              skipped++;
            } else {
              console.error(`Error creating index: ${query}`, err.sqlMessage || err);
              failed++;
            }
          } else {
            created++;
          }
          resolve();
        });
      });
    }
  }

  console.log(`Index resolution complete: ${created} created, ${skipped} skipped, ${failed} failed.`);
}

module.exports = { createIndexesIfNeeded };
