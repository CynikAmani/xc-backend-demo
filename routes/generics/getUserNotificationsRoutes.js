const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const checkSession = require('../../auth/checkSession');

// Route to get paginated notifications
router.get('/', checkSession, (req, res) => {
  const username = req.session.userId;
  const limit = parseInt(req.query.limit) || 20;
  const lastId = req.query.lastId || null;

  let query = `
    SELECT 
      notification_id AS id,
      notification_type AS type,
      is_viewed,
      content,
      DATE_FORMAT(date, '%Y-%m-%d %H:%i:%s') AS date
    FROM notifications
    WHERE target_user = ?`;
  
  const params = [username];

  if (lastId) {
    query += ` AND notification_id < ?`;
    params.push(lastId);
  }

  query += ` ORDER BY notification_id DESC LIMIT ?`;
  params.push(limit);

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.status(200).json(results);
  });
});

module.exports = router;
