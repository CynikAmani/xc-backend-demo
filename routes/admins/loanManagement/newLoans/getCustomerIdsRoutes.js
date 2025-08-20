const express = require('express');
const router = express.Router();
const db = require('../../../../config/db'); 

// Route to get usernames and fullnames for users with user_type 'customer'
router.get('/', (req, res) => {
  const query = `
    SELECT user_id, fullname
    FROM users
    WHERE user_type LIKE 'customer'
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching customers:', err);
      return res.status(500).json({ message: 'Failed to fetch customers. Please try again later.' });
    }

    const customerIds = results.map(customer => ({
      id: customer.user_id,
      label: `${customer.fullname} (${customer.user_id})`
    }));

    res.status(200).json(customerIds);
  });
});

module.exports = router;
