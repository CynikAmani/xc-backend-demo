const express = require('express');
const router = express.Router();
const db = require('../../config/db');

router.get('/', (req, res) => {
  db.query('SELECT gender_id AS id, gender AS label FROM genders', (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    
    res.status(200).json(results);
  });
});

module.exports = router;
