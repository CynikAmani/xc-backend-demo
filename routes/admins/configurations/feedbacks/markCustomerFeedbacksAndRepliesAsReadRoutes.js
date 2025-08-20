const express = require('express');
const router = express.Router();
const { db } = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');

router.put('/', checkAdmin, (req, res) => {
  const { feedbackIds = [], replyIds = [] } = req.body;

  if (!Array.isArray(feedbackIds) || !Array.isArray(replyIds)) {
    return res.status(400).json({ error: 'Invalid payload structure' });
  }

  const markFeedbacksSeen = feedbackIds.length
    ? new Promise((resolve, reject) => {
        const sql = `UPDATE feedbacks SET is_seen = TRUE WHERE id IN (?)`;
        db.query(sql, [feedbackIds], (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      })
    : Promise.resolve();

  const markRepliesRead = replyIds.length
    ? new Promise((resolve, reject) => {
        const sql = `UPDATE feedback_chats SET is_new_reply = FALSE WHERE chat_text_id IN (?)`;
        db.query(sql, [replyIds], (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      })
    : Promise.resolve();

  Promise.all([markFeedbacksSeen, markRepliesRead])
    .then(() => res.json({ success: true }))
    .catch((err) => {
      console.error('Error updating feedback or replies:', err);
      res.status(500).json({ error: 'Failed to mark feedbacks or replies as read' });
    });
});

module.exports = router;
