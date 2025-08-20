const express = require('express');
const db = require('../../../config/db');
const checkSession = require('../../../auth/checkSession');
const router = express.Router();


// GET feedbacks for logged-in customer with category and replies
router.get('/', checkSession, (req, res) => {
  const sessionUserId = req.session.userId;
  if (!sessionUserId) return res.status(401).json({ message: 'Unauthorized' });

  const feedbackQuery = `
    SELECT 
      f.id AS feedback_id,
      f.feedback_text,
      f.created_at,
      f.is_seen,
      c.name AS category_name,
      c.description AS category_description
    FROM feedbacks f
    JOIN feedback_categories c ON f.category_id = c.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `;

  db.query(feedbackQuery, [sessionUserId], (err, feedbacks) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    const feedbackIds = feedbacks.map(fb => fb.feedback_id);
    if (feedbackIds.length === 0) return res.status(200).json([]);

    const replyQuery = `
      SELECT 
        feedback_id, chat_text_id, chat_text, is_new_reply, date_replied, sender_id
      FROM feedback_chats
      WHERE feedback_id IN (?)
    `;

    db.query(replyQuery, [feedbackIds], (err, replies) => {
      if (err) {
        console.error('Reply fetch error:', err);
        return res.status(500).json({ message: 'Failed to fetch replies.' });
      }

      const replyMap = {};
      replies.forEach(r => {
        const replyObj = {
          chat_text_id: r.chat_text_id,
          chat_text: r.chat_text,
          is_new_reply: r.is_new_reply,
          date_replied: r.date_replied,
          them: r.sender_id !== sessionUserId
        };
        if (!replyMap[r.feedback_id]) {
          replyMap[r.feedback_id] = [replyObj];
        } else {
          replyMap[r.feedback_id].push(replyObj);
        }
      });

      const feedbacksWithReplies = feedbacks.map(fb => ({
        ...fb,
        replies: replyMap[fb.feedback_id] || []
      }));

      res.status(200).json(feedbacksWithReplies);
    });
  });
});

module.exports = router;
