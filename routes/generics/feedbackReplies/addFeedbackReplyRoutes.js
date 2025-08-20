const express = require('express');
const db = require('../../../config/db');
const checkSession = require('../../../auth/checkSession');
const router = express.Router();

// Save feedback reply and return updated feedback object with replies
router.post('/', checkSession, (req, res) => {
  const { feedbackId, replyText } = req.body;
  const senderId = req.session.userId;

  if (!feedbackId || !replyText?.trim()) {
    return res.status(400).json({ error: 'Missing feedbackId or replyText' });
  }

  const insertQuery = `
    INSERT INTO feedback_chats (feedback_id, chat_text, sender_id)
    VALUES (?, ?, ?)
  `;

  db.query(insertQuery, [feedbackId, replyText.trim(), senderId], (err, result) => {
    if (err) {
      console.error('DB insert error:', err);
      return res.status(500).json({ error: 'Database insert failed' });
    }

    // After inserting, fetch the updated feedback with replies
    const feedbackQuery = `
      SELECT 
        f.id AS feedback_id,
        f.feedback_text,
        f.created_at,
        c.name AS category_name,
        c.description AS category_description,
        u.fullname AS customer_name
      FROM feedbacks f
      JOIN feedback_categories c ON f.category_id = c.id
      JOIN users u ON f.user_id = u.user_id
      WHERE f.id = ?
    `;

    db.query(feedbackQuery, [feedbackId], (err, feedbackResults) => {
      if (err || feedbackResults.length === 0) {
        console.error('Feedback fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch feedback.' });
      }

      const feedback = feedbackResults[0];

      const replyQuery = `
        SELECT 
          chat_text_id, chat_text, is_new_reply, date_replied, sender_id
        FROM feedback_chats
        WHERE feedback_id = ?
        ORDER BY date_replied ASC
      `;

      db.query(replyQuery, [feedbackId], (err, replyResults) => {
        if (err) {
          console.error('Reply fetch error:', err);
          return res.status(500).json({ error: 'Failed to fetch replies.' });
        }

        // Map replies and add 'them' flag
        const replies = replyResults.map(r => ({
          chat_text_id: r.chat_text_id,
          chat_text: r.chat_text,
          is_new_reply: r.is_new_reply,
          date_replied: r.date_replied,
          them: r.sender_id !== senderId
        }));

        const updatedFeedback = {
          ...feedback,
          replies
        };

        res.status(200).json(updatedFeedback);
      });
    });
  });
});

module.exports = router;
