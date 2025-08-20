const express = require('express');
const db = require('../../../config/db');
const checkSession = require('../../../auth/checkSession');
const router = express.Router();

router.put('/', checkSession, (req, res) => {
  const { replyIds } = req.body;

  if (!Array.isArray(replyIds) || replyIds?.length === 0) {
    return res.status(400).json({ message: 'No reply IDs provided.' });
  }

  const updateQuery = `
    UPDATE feedback_chats 
    SET is_new_reply = FALSE 
    WHERE chat_text_id IN (?)
  `;

  db.query(updateQuery, [replyIds], (err, result) => {
    if (err) {
      console.error('Failed to update replies:', err);
      return res.status(500).json({ message: 'Failed to update replies.' });
    }

    res.status(200).json({ message: 'Replies marked as read.', affectedRows: result.affectedRows });
  });
});

module.exports = router;
