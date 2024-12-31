const express = require('express');
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');
const router = express.Router();

// Endpoint to get feedbacks with category details and customer name
router.get('/', checkAdmin
    , (req, res) => {
  // SQL query to fetch feedbacks along with category details and customer name
  const query = `
    SELECT 
      f.id AS feedback_id,
      f.feedback_text,
      f.created_at,
      c.name AS category_name,
      c.description AS category_description,
      u.fullname AS customer_name
    FROM feedbacks f
    JOIN feedback_categories c ON f.category_id = c.id
    JOIN users u ON f.user_id = u.user_id
    ORDER BY f.created_at DESC
  `;

  // Execute the query
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    // Respond with the feedback data
    res.status(200).json(results);
  });
});

module.exports = router;
