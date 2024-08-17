const express = require('express');
const router = express.Router();
const db = require('../../../config/db');

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

router.delete('/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;

  const deleteQuery = 'DELETE FROM terms_and_conditions WHERE id = ?';

  db.query(deleteQuery, [id], (err, result) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Terms and Conditions not found' });
    }

    res.status(200).json({ message: 'Terms and Conditions deleted successfully' });
  });
});

module.exports = router;
