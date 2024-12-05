const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const moment = require('moment');
const checkSession = require('../../../../auth/checkSession');

// Insert or update loan application
router.post('/', checkSession, (req, res) => {
  const { loanApplicationId, loanAmount, collateral, numWeeks, location } = req.body;
  const { userId } = req.session;

  if (!loanAmount || !collateral || !numWeeks || !location) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Check if the user is blocked
  const checkBlockedQuery = 'SELECT is_blocked FROM users WHERE user_id = ?';
  db.query(checkBlockedQuery, [userId], (err, result) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const { is_blocked } = result[0];
    if (is_blocked) {
      return res.status(423).json({ message: 'Your account is blocked. You cannot apply for a loan. To resolve this, consider contacting Xander Creditors.' });
    }

    const handleResponse = (loanApplicationId) => {
      // Fetch customer and admin information
      const customerQuery = 'SELECT fullname, email FROM users WHERE user_id = ?';
      const adminQuery = 'SELECT email FROM users WHERE user_type LIKE ?';

      db.query(customerQuery, [userId], (err, customerResult) => {
        if (err) {
          console.error('Error fetching customer information:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }

        if (customerResult.length === 0) {
          return res.status(404).json({ message: 'Customer information not found.' });
        }

        const customer = customerResult[0];

        db.query(adminQuery, ['%root%'], (err, adminResults) => {
          if (err) {
            console.error('Error fetching admin information:', err);
            return res.status(500).json({ message: 'Internal server error' });
          }

          const admins = adminResults.map((admin) => admin.email);

          res.status(200).json({
            message: loanApplicationId
              ? 'Loan application updated successfully.'
              : 'Loan application submitted successfully.',
            loanApplicationId,
            customer,
            admins,
          });
        });
      });
    };

    if (loanApplicationId) {
      // Update existing loan application
      const updateQuery = `
        UPDATE loan_applications 
        SET loan_amount = ?, collateral = ?, num_weeks = ?, location = ?, date_applied = ?
        WHERE id = ? AND applicant_id = ?`;
      const updateValues = [loanAmount, collateral, numWeeks, location, moment().format('YYYY-MM-DD HH:mm:ss'), loanApplicationId, userId];

      db.query(updateQuery, updateValues, (err, result) => {
        if (err) {
          console.error('Database update error:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Loan application not found or not authorized to update.' });
        }
        handleResponse(loanApplicationId);
      });
    } else {
      // Insert new loan application
      const insertQuery = `
        INSERT INTO loan_applications (applicant_id, loan_amount, collateral, num_weeks, location, date_applied)
        VALUES (?, ?, ?, ?, ?, ?)`;
      const insertValues = [userId, loanAmount, collateral, numWeeks, location, moment().format('YYYY-MM-DD HH:mm:ss')];

      db.query(insertQuery, insertValues, (err, result) => {
        if (err) {
          console.error('Database insertion error:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }
        handleResponse(result.insertId);
      });
    }
  });
});

module.exports = router;
