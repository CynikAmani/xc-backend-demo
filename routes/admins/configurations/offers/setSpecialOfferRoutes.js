const express = require('express');
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');
const router = express.Router();

// Route to insert a special offer
router.post('/', checkAdmin, (req, res) => {
  const { discount, customerId } = req.body;

  // Validate input
  if (!discount || !customerId) {
    return res.status(400).json({ message: 'Discount and customer ID are required.' });
  }

  // SQL query to insert the special offer
  const query = `
    INSERT INTO special_offers (discount_value, target_customer, offer_date)
    VALUES (?, ?, CURDATE())
  `;

  db.query(query, [discount, customerId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    res.status(201).json({ message: 'Special offer created successfully.', offerId: results.insertId });
  });
});

module.exports = router;
