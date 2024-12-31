const express = require('express');
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');
const router = express.Router();

// Route to get special offers for review
router.get('/', checkAdmin, (req, res) => {
  const query = `
     SELECT 
       u.fullname AS customerName,
       u.email AS customerEmail,
       u.phone AS customerPhone,
       s.discount_value AS discount,
       s.offer_date AS offerDate,
       s.redeemed AS isRedeemed
     FROM special_offers s
     INNER JOIN users u ON s.target_customer = u.user_id
     ORDER BY s.offer_date DESC
    `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    // Map results to an array of objects
    const offers = results.map(row => ({
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      discount: row.discount,
      offerDate: row.offerDate,
      isRedeemed: row.isRedeemed
    }));

    res.json(offers);
  });
});

module.exports = router;
