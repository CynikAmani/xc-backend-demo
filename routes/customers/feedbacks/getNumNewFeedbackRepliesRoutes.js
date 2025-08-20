const express = require('express');
const router = express.Router();
const { db } = require('../../../config/db');
const checkSession = require('../../../auth/checkSession');

router.get('/', checkSession, (req, res) => {
  const userId = req.session.userId;

  const query = `
    SELECT COUNT(fc.chat_text_id) AS numNewReplies
    FROM feedback_chats fc
    JOIN feedbacks f ON fc.feedback_id = f.id
    WHERE f.user_id = ? 
      AND fc.sender_id != ? 
      AND fc.is_new_reply = TRUE
  `;

  db.query(query, [userId, userId], (err, results) => {
    if (err) {
      console.error('Error fetching new replies count:', err);
      return res.status(500).json({ error: 'Failed to fetch new replies count' });
    }

    res.json({ numNewReplies: results[0].numNewReplies });
  });
});

module.exports = router;
