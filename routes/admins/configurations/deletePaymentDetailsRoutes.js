const express = require('express');
const router = express.Router();
const db = require('../../../config/db');

router.delete('/', (req, res) => {
  const { userId } = req.session;
  const { id } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!id) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const query = 'DELETE FROM payment_details WHERE payment_detail_id = ?';
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Payment detail not found' });
    }

    res.status(200).json({ message: 'Payment detail deleted successfully' });
  });
});

module.exports = router;
