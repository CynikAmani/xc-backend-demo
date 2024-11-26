const express = require('express');
const db = require('../../../../config/db');
const router = express.Router();

// Route to get all brand image names
router.get('/', (req, res) => {
  const query = 'SELECT brand_image_name FROM brand_images';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    res.json(results.map((row) => row.brand_image_name));
  });
});

module.exports = router;
