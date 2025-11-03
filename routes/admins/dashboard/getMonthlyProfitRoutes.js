const express = require('express');
const db = require('../../../config/db');
const checkAdmin = require('../../../auth/checkAdmin');
const router = express.Router();

router.post('', checkAdmin, (req, res) => {
  const { year } = req.body;
  const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

  if (isNaN(targetYear)) {
    return res.status(400).json({ message: 'Invalid year provided.' });
  }

  const query = `
    SELECT 
      DATE_FORMAT(end_date, '%b') AS month, 
      SUM(return_amount - loan_amount) AS total_profit
    FROM loans
    WHERE is_cleared = TRUE AND YEAR(end_date) = ?
    GROUP BY MONTH(end_date)
    ORDER BY MONTH(end_date);
  `;

  db.query(query, [targetYear], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    res.status(200).json({
      message: 'Monthly cleared loan profits retrieved successfully.',
      year: targetYear,
      profits: results,
    });
  });
});

module.exports = router;
