const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin'); // Authentication middleware

// Route to update the message body
router.put('/', checkAdmin, (req, res) => {
  const { messageId, messageBody } = req.body;

  if (!messageId || !messageBody) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const query = 'UPDATE messages SET message = ? WHERE message_id = ?';
  const values = [messageBody, messageId];

  db.query(query, values, (err, results) => {
    if (err) {
      console.error('Database update error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.status(200).json({ message: 'Message updated successfully' });
  });
});

module.exports = router;
