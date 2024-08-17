const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');

// Middleware to check user authorization
const checkAuth = (req, res, next) => {
  const { userId } = req.session;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User not logged in' });
  }
  next();
};

// Delete loan application
router.delete('/', checkAuth, (req, res) => {
  const { loanApplicationId } = req.body;
  const { userId } = req.session;

  if (!loanApplicationId) {
    return res.status(400).json({ message: 'Loan application ID is required.' });
  }

  const query = 'DELETE FROM loan_applications WHERE id = ? AND applicant_id = ?';
  const values = [loanApplicationId, userId];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Database deletion error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Loan application not found or not authorized to delete.' });
    }
    res.status(200).json({ message: 'Loan application deleted successfully.' });
  });
});

module.exports = router;
