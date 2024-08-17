const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');


// Route to get loan balance
router.get('/', checkAdmin, (req, res) => {
  const { loanId } = req.query;

  if (!loanId) {
    return res.status(400).json({ message: 'Missing loan ID' });
  }

  // Fetch the return_amount from the loans table
  const loanQuery = 'SELECT return_amount FROM loans WHERE loan_id = ?';
  db.query(loanQuery, [loanId], (err, loanResult) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!loanResult || loanResult.length === 0) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const { return_amount } = loanResult[0];

    // Calculate the total amount paid
    const paymentsQuery = 'SELECT SUM(amount_paid) AS total_paid FROM payments WHERE loan_id = ?';
    db.query(paymentsQuery, [loanId], (err, paymentsResult) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      const totalPaid = paymentsResult[0].total_paid || 0;
      const balance = return_amount - totalPaid;

      res.status(200).json({
        loanId,
        returnAmount: return_amount,
        totalPaid,
        balance
      });
    });
  });
});

module.exports = router;
