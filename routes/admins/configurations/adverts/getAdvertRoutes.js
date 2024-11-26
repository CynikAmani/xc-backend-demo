const express = require('express');
const db = require('../../../../config/db');
const router = express.Router();


// Route to get the advert record
router.get('/', (req, res) => {
  const query = 'SELECT * FROM adverts LIMIT 1';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'No advert found' });
    }

    res.json(results[0]);
  });
});

module.exports = router;
