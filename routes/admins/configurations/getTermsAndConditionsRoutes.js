// routes/getTermsAndConditionsRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../../../config/db');

router.get('/', (req, res) => {
  const selectQuery = `
    SELECT id, version, title, content, effective_date, created_at, updated_at
    FROM terms_and_conditions
    ORDER BY effective_date DESC;
  `;

  db.query(selectQuery, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    const termsAndConditions = results.map(row => ({
      id: row.id,
      version: row.version,
      title: row.title,
      content: row.content,
      effectiveDate: row.effective_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.status(200).json({ termsAndConditions });
  });
});

module.exports = router;
