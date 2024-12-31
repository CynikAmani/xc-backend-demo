const express = require('express');
const db = require('../../../../config/db');
const checkSession = require('../../../../auth/checkSession');
const router = express.Router();

// Endpoint to save feedback
router.post('/', checkSession, (req, res) => {
  const { categoryId, feedbackText } = req.body;

  // Validate the input
  if (!categoryId || !feedbackText) {
    return res.status(400).json({ message: 'Category ID and Feedback text are required.' });
  }

  // SQL query to insert the feedback into the database
  const query = `
    INSERT INTO feedbacks (user_id, category_id, feedback_text)
    VALUES (?, ?, ?)
  `;

  // Get the user ID from the session
  const userId = req.session.userId;

  // Execute the query with a callback
  db.query(query, [userId, categoryId, feedbackText], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    // Respond with success message if no error occurred
    res.status(201).json({ message: 'Feedback saved successfully.' });
  });
});

module.exports = router;
