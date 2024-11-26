const express = require('express');
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');
const router = express.Router();


// Route to delete a brand image by name
router.delete('/', checkAdmin, (req, res) => {
  const { imageName } = req.body;

  if (!imageName) {
    return res.status(400).json({ message: 'Brand image name is required.' });
  }

  // SQL query to delete the brand image
  const query = 'DELETE FROM brand_images WHERE brand_image_name = ?';

  db.query(query, [imageName], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Brand image not found.' });
    }

    res.json({ message: 'Brand image deleted successfully.' });
  });
});

module.exports = router;
