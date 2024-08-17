const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const checkSession = require('../../auth/checkSession');

// Route to get all notifications for a specific user
router.get('/', checkSession, (req, res) => {
  const username = req.session.userId;

  const query = `
    SELECT 
      notification_id AS id, 
      notification_type AS type, 
      content, 
      DATE_FORMAT(date, '%Y-%m-%d %H:%i:%s') AS date 
    FROM 
      notifications 
    WHERE 
      target_user = ? 
    ORDER BY 
      date DESC`;

  db.query(query, [username], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    res.status(200).json(results);
  });
});

module.exports = router;
