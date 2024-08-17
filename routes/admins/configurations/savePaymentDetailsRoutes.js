const express = require('express');
const router = express.Router();
const db = require('../../../config/db');

router.post('/', (req, res) => {
  const { userId } = req.session;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { paymentModeName, accountName, accountNumber, paymentDetailsId } = req.body;

  if (!paymentModeName || !accountName || !accountNumber) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (paymentDetailsId) {
    // Update existing record
    const updateQuery = `
      UPDATE payment_details 
      SET payment_mode_name = ?, account_name = ?, account_number = ? 
      WHERE payment_detail_id = ?`;
    db.query(updateQuery, [paymentModeName, accountName, accountNumber, paymentDetailsId], (err, result) => {
      if (err) {
        console.error('Database update error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.status(200).json({ message: 'Payment details updated successfully' });
    });
  } else {
    // Insert new record
    const insertQuery = `
      INSERT INTO payment_details (payment_mode_name, account_name, account_number) 
      VALUES (?, ?, ?)`;
    db.query(insertQuery, [paymentModeName, accountName, accountNumber], (err, result) => {
      if (err) {
        console.error('Database insertion error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.status(200).json({ message: 'Payment details added successfully' });
    });
  }
});

module.exports = router;
