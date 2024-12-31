const express = require('express');
const db = require('../../../../config/db');
const checkSession = require('../../../../auth/checkSession');

const router = express.Router();

// Route to get special offers for review by logged-in customer
router.get('/', checkSession, (req, res) => {
  // Get logged-in customer ID from session
  const loggedInUserId = req.session.userId;

  // Check if userId exists in session
  if (!loggedInUserId) {
    return res.status(401).json({ message: 'Unauthorized: Please log in first.' });
  }

  const query = `
    SELECT 
      u.fullname AS customerName,
      s.discount_value AS discount,
      s.offer_date AS offerDate,
      s.redeemed AS isRedeemed,
      s.id AS offerId
    FROM special_offers s
    INNER JOIN users u ON s.target_customer = u.user_id
    WHERE s.target_customer = ?
    ORDER BY s.offer_date DESC
  `;

  db.query(query, [loggedInUserId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    // Map results to an array of objects
    const offers = results.map(row => ({
      customerName: row.customerName,
      discount: row.discount,
      offerDate: row.offerDate,
      isRedeemed: row.isRedeemed,
      offerId: row.offerId
    }));

    res.json(offers);
  });
});

module.exports = router;
