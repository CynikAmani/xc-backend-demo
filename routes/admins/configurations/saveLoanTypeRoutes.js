const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const checkAdmin = require('../../../auth/checkAdmin')


router.post('/', checkAdmin, (req, res) => {
  const { loanTypeId, loanType } = req.body;

  if (!loanType) {
    return res.status(400).json({ message: 'Missing required field: loanType' });
  }

  if (loanTypeId) {
    // Update existing record
    const updateQuery = 'UPDATE loan_types SET type_name = ? WHERE loan_type_id = ?';
    db.query(updateQuery, [loanType, loanTypeId], (err, result) => {
      if (err) {
        console.error('Database update error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.status(200).json({ message: 'Loan type updated successfully' });
    });
  } else {
    // Insert new record
    const insertQuery = 'INSERT INTO loan_types (type_name) VALUES (?)';
    db.query(insertQuery, [loanType], (err, result) => {
      if (err) {
        console.error('Database insertion error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      res.status(200).json({ message: 'Loan type added successfully' });
    });
  }
});

module.exports = router;
