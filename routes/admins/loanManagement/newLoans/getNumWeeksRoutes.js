const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');

// Route to get distinct number of weeks from interest_rates with loan types and interest rates
router.get('/', (req, res) => {
  const query = `
    SELECT DISTINCT ir.num_weeks, lt.type_name, ir.normal_rate 
    FROM interest_rates ir
    JOIN loan_types lt ON ir.loan_type_id = lt.loan_type_id
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    const numWeeks = results.map((row) => ({
      id: row.num_weeks,
      label: `${row.num_weeks} ${row.num_weeks > 1 ? 'weeks' : 'week'} (${row.type_name} - ${row.normal_rate}%)`
    }));

    res.status(200).json(numWeeks);
  });
});

module.exports = router;
