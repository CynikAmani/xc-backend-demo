const express = require('express');
const router = express.Router();
const db = require('../../../../config/db'); 

// Route to get usernames and fullnames for users with user_type 'customer'
router.get('/', async (req, res) => {
  try {
    // SQL query to fetch customer user_id and fullname
    const query = `
      SELECT user_id, fullname
      FROM users
      WHERE user_type LIKE 'customer'
    `;
    
    // Run the query
    const [customersResult] = await db.promise().query(query);

    // Transform the result into the desired format
    const customerIds = customersResult.map(customer => ({
      id: customer.user_id, // user_id as the 'id'
      label: `${customer.fullname} (${customer.user_id})` 
    }));

    // Send the response with the customerIds array
    res.status(200).json(customerIds);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Failed to fetch customers. Please try again later.' });
  }
});

module.exports = router;
