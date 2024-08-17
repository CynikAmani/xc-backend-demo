const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const checkSession = require('../../../auth/checkSession');

router.get('/', checkSession, (req, res) => {

  const query = 'SELECT * FROM payment_details';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // Format the results to match the front-end format
    const formattedResults = results.map(row => ({
      id: row.payment_detail_id,
      paymentModeName: row.payment_mode_name,
      accountName: row.account_name,
      accountNumber: row.account_number
    }));

    res.status(200).json(formattedResults);
  });
});

module.exports = router;
