const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const checkSession = require('../../../auth/checkSession');

// Route to get loan statistics
router.get('/', checkSession, async (req, res) => {
  const userId = req.session.userId;

  try {
    // Query to get all uncleared loans
    const loansQuery = `
      SELECT 
        l.loan_id, 
        l.return_amount, 
        l.end_date
      FROM loans l
      WHERE l.is_cleared = false AND l.customer_id = ?
    `;

    db.query(loansQuery, [userId], (err, loansResults) => {
      if (err) {
        console.error('Error fetching loan data:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      let totalBalance = 0;
      let closestEndDate = null;
      const loanIds = loansResults.map(loan => loan.loan_id);

      if (loanIds.length > 0) {
        // Calculate total balance and determine closest end date
        loansResults.forEach(loan => {
          const balance = loan.return_amount;

          // Query to get the total payments made for this loan
          const paymentsQuery = `
            SELECT SUM(amount_paid) AS total_paid
            FROM payments
            WHERE loan_id = ?
          `;

          db.query(paymentsQuery, [loan.loan_id], (err, paymentsResults) => {
            if (err) {
              console.error('Error fetching payments data:', err);
              return res.status(500).json({ message: 'Internal server error' });
            }

            const totalPaid = paymentsResults[0].total_paid || 0;
            const outstandingBalance = balance - totalPaid;
            totalBalance += outstandingBalance;

            if (!closestEndDate || new Date(loan.end_date) < new Date(closestEndDate)) {
              closestEndDate = loan.end_date;
            }
          });
        });
      } else {
        // No loans present, set default values
        totalBalance = 0;
        closestEndDate = 'N/A';
      }

      // Fetch the latest payment date for the user across all loans
      const latestPaymentDateQuery = `
        SELECT MAX(p.date_paid) AS latest_payment_date
        FROM payments p
        JOIN loans l ON p.loan_id = l.loan_id
        WHERE l.customer_id = ?
      `;

      db.query(latestPaymentDateQuery, [userId], (err, latestPaymentResults) => {
        if (err) {
          console.error('Error fetching latest payment date:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }

        const latestPaymentDate = latestPaymentResults[0].latest_payment_date || 'N/A';
        finalizeResponse(latestPaymentDate);
      });

      function finalizeResponse(latestPaymentDate) {
        // Query to get the number of loan applications
        const applicationsQuery = `
          SELECT COUNT(*) AS num_applications
          FROM loan_applications
          WHERE applicant_id = ?
        `;

        db.query(applicationsQuery, [userId], (err, applicationsResults) => {
          if (err) {
            console.error('Error fetching loan applications:', err);
            return res.status(500).json({ message: 'Internal server error' });
          }
          const numApplications = applicationsResults[0].num_applications;

          // Query to get the number of completed loans
          const completedLoansQuery = `
            SELECT COUNT(*) AS num_completed_loans
            FROM loans
            WHERE is_cleared = true AND customer_id = ?
          `;

          db.query(completedLoansQuery, [userId], (err, completedLoansResults) => {
            if (err) {
              console.error('Error fetching completed loans:', err);
              return res.status(500).json({ message: 'Internal server error' });
            }
            const numCompletedLoans = completedLoansResults[0].num_completed_loans;

            // Query to get the number of active loans
            const activeLoansQuery = `
              SELECT COUNT(*) AS num_active_loans
              FROM loans
              WHERE is_cleared = false AND customer_id = ?
            `;

            db.query(activeLoansQuery, [userId], (err, activeLoansResults) => {
              if (err) {
                console.error('Error fetching active loans:', err);
                return res.status(500).json({ message: 'Internal server error' });
              }
              const numActiveLoans = activeLoansResults[0].num_active_loans;

              // Respond with the aggregated loan statistics
              res.status(200).json({
                totalBalance,
                closestEndDate: closestEndDate || 'N/A',
                latestPaymentDate,
                numApplications,
                numCompletedLoans,
                numActiveLoans 
              });
            }); 
          });
        });
      }
    });
  } catch (error) {
    console.error('Error fetching loan stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
