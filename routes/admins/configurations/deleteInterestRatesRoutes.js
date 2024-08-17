const express = require('express');
const router = express.Router();
const db = require('../../../config/db');

// Middleware to check user authorization
const checkAdmin = (req, res, next) => {
  const { userId } = req.session;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User not logged in' });
  }

  const query = 'SELECT user_type FROM users WHERE user_id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (results.length === 0 || results[0].user_type !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  });
};

router.delete('/', checkAdmin, (req, res) => {
  const { id } = req.body;
  console.log(id);

  if (!id) {
    return res.status(400).json({ message: 'Missing required field: id' });
  }

  const query = 'DELETE FROM interest_rates WHERE rate_id = ?';

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Interest rate not found' });
    }
    res.status(200).json({ message: 'Interest rate deleted successfully' });
  });
});

module.exports = router;
