// routes/saveTnCRoutes.js
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

router.post('/', isAuthenticated, (req, res) => {
  const { id, version, title, content, effectiveDate } = req.body;

  // Check for missing required fields
  if (!version || !title || !content || !effectiveDate) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // If id exists, update the existing record
  if (id) {
    const updateQuery = `
      UPDATE terms_and_conditions
      SET version = ?, title = ?, content = ?, effective_date = ?
      WHERE id = ?;
    `;
    db.query(updateQuery, [version, title, content, effectiveDate, id], (err, result) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Terms and Conditions not found' });
      }

      res.status(200).json({ message: 'Terms and Conditions updated successfully' });
    });
  } else {
    // Insert a new record
    const insertQuery = `
      INSERT INTO terms_and_conditions (version, title, content, effective_date)
      VALUES (?, ?, ?, ?);
    `;
    db.query(insertQuery, [version, title, content, effectiveDate], (err, result) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      res.status(201).json({ message: 'Terms and Conditions created successfully' });
    });
  }
});

module.exports = router;
