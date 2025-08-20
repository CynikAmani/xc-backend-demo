const express = require('express');
const router = express.Router();
const { db } = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');

router.get('/', checkAdmin, (req, res) => {
  const query = `
    SELECT
      (SELECT COUNT(*) FROM feedbacks WHERE is_seen = FALSE) AS unseenFeedbacks,
      (SELECT COUNT(*) 
       FROM feedback_chats fc
       JOIN users u ON fc.sender_id = u.user_id
       WHERE fc.is_new_reply = TRUE
         AND u.user_type LIKE '%customer%') AS unseenRepliesFromCustomers
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching admin unseen counts:', err);
      return res.status(500).json({ error: 'Failed to fetch admin unseen counts' });
    }

    const { unseenFeedbacks, unseenRepliesFromCustomers } = results[0];
    res.json({ unseenFeedbacks, unseenRepliesFromCustomers });
  });
});

module.exports = router;
