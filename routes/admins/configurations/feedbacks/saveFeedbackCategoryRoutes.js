const express = require('express');
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');
const router = express.Router();

// Route to save or update a feedback category
router.post('/', checkAdmin, (req, res) => {
  const { id, name, description } = req.body;

  // Validate input
  if (!name || !description) {
    return res.status(400).json({ message: 'Name and description are required.' });
  }

  // If id exists, we update the category; otherwise, we insert a new category
  if (id) {
    // SQL query to update the feedback category by id
    const updateQuery = `
      UPDATE feedback_categories
      SET name = ?, description = ?
      WHERE id = ?
    `;

    db.query(updateQuery, [name, description, id], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
      }

      // Check if the category exists
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Category not found.' });
      }

      res.status(200).json({ message: 'Feedback category updated successfully.' });
    });

  } else {
    // SQL query to insert a new feedback category
    const insertQuery = `
      INSERT INTO feedback_categories (name, description)
      VALUES (?, ?)
    `;

    db.query(insertQuery, [name, description], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'Category name must be unique.' });
        }
        return res.status(500).json({ message: 'Internal server error.' });
      }

      res.status(201).json({ message: 'Feedback category saved successfully.', categoryId: results.insertId });
    });
  }
});

module.exports = router;
