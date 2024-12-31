const express = require('express');
const db = require('../../../config/db');
const checkAdmin = require('../../../auth/checkAdmin');
const router = express.Router();

// Route to fetch loan performance data
router.post('/', checkAdmin, (req, res) => {
  const { selectedMonth, selectedYear } = req.body; // Assuming parameters are sent in the body

  // Ensure the selectedMonth and selectedYear are valid
  const month = parseInt(selectedMonth, 10);
  const year = parseInt(selectedYear, 10);

  if (isNaN(month) || isNaN(year)) {
    return res.status(400).json({ message: 'Invalid month or year provided.' });
  }

  // Queries with dynamic month and year
  const queries = {
    monthly: `
      SELECT DATE(start_date) AS date, COUNT(*) AS loan_count
      FROM loans
      WHERE MONTH(start_date) = ? AND YEAR(start_date) = ?
      GROUP BY DATE(start_date)
      ORDER BY DATE(start_date);
    `,
    annual: `
      SELECT MONTHNAME(start_date) AS month, COUNT(*) AS loan_count
      FROM loans
      WHERE YEAR(start_date) = ?
      GROUP BY MONTH(start_date)
      ORDER BY MONTH(start_date);
    `,
  };

  // Execute both queries concurrently with the selected parameters
  const promises = Object.keys(queries).map((key) =>
    new Promise((resolve, reject) => {
      const query = queries[key];
      const params = key === 'monthly' ? [month, year] : [year]; // Monthly query uses month and year; Annual query uses only year

      db.query(query, params, (err, results) => {
        if (err) reject(err);
        resolve({ key, results });
      });
    })
  );

  // Combine results and send response as in the original format
  Promise.all(promises)
    .then((data) => {
      // Combine results into a single response object
      const response = data.reduce((acc, { key, results }) => {
        acc[key] = results;
        return acc;
      }, {});

      res.status(200).json({
        message: 'Loan performance data retrieved successfully.',
        data: response, // This matches the original format
      });
    })
    .catch((err) => {
      console.error('Database error:', err);
      res.status(500).json({ message: 'Internal server error.' });
    });
});

module.exports = router;
