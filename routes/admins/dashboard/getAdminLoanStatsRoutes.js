const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const checkAdmin = require('../../../auth/checkAdmin');

// Route to get admin statistics
router.get('/', checkAdmin, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Query to get the user type for the logged-in user
    const userTypeQuery = `
      SELECT user_type 
      FROM users 
      WHERE user_id = ?
    `;
    
    // Execute the query to get the user type
    const [userTypeResults] = await db.promise().query(userTypeQuery, [userId]);
    
    if (userTypeResults.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userType = userTypeResults[0].user_type;

    // Proceed with other queries
    const totalActiveLoansQuery = `
      SELECT COUNT(*) AS total_active_loans
      FROM loans
      WHERE is_cleared = false
    `;

    const totalCustomerBalanceQuery = `
      SELECT
        SUM(l.return_amount) - COALESCE(SUM(p.total_paid), 0) AS total_balance
      FROM loans l
      LEFT JOIN (
        SELECT loan_id, COALESCE(SUM(amount_paid), 0) AS total_paid
        FROM payments
        GROUP BY loan_id
      ) p ON l.loan_id = p.loan_id
      WHERE l.is_cleared = false
    `;

    const loanApplicationsQuery = `
      SELECT COUNT(*) AS total_applications
      FROM loan_applications
    `;

    const totalUsersQuery = `
      SELECT COUNT(*) AS total_users
      FROM users WHERE user_type = 'customer'
    `;

    const numDelinquentLoansQuery = `
      SELECT COUNT(*) AS num_delinquent_loans
      FROM loans
      WHERE is_cleared = false AND end_date < NOW()
    `;

    const totalInterestQuery = `
      SELECT SUM(l.return_amount - l.loan_amount) AS total_interest
      FROM loans l
      WHERE l.is_cleared = true
    `;

    const monthlyCollectedInterestQuery = `
      SELECT 
        SUM(l.return_amount - l.loan_amount) AS monthly_collected_interest
      FROM loans l
      WHERE l.is_cleared = true
        AND MONTH(l.end_date) = MONTH(CURRENT_DATE)
        AND YEAR(l.end_date) = YEAR(CURRENT_DATE)
    `;


    const yearlyCollectedInterestQuery = `
      SELECT 
        SUM(l.return_amount - l.loan_amount) AS yearly_collected_interest
      FROM loans l
      WHERE l.is_cleared = true
        AND YEAR(l.end_date) = YEAR(CURRENT_DATE)
    `;


    const numActiveLoansQuery = `
      SELECT COUNT(*) AS num_active_loans
      FROM loans
      WHERE is_cleared = false
    `;

    const totalLoansIssuedQuery = `
      SELECT COUNT(*) AS total_loans_issued
      FROM loans
    `;

    const totalAmountDisbursedQuery = `
      SELECT SUM(loan_amount) AS total_amount_disbursed
      FROM loans
    `;

    const totalAmountDisbursedCurrentMonthQuery = `
      SELECT SUM(loan_amount) AS total_amount_disbursed_current_month
      FROM loans
      WHERE MONTH(start_date) = MONTH(CURRENT_DATE)
      AND YEAR(start_date) = YEAR(CURRENT_DATE)
    `;

    const yearlyDisbursedAmountQuery = `
     SELECT SUM(loan_amount) AS yearly_disbursed_amount
     FROM loans
     WHERE YEAR(start_date) = YEAR(CURRENT_DATE)
   `;


    const averageLoanAmountQuery = `
      SELECT 
        (SUM(l.loan_amount) + COALESCE(SUM(la.loan_amount), 0)) / 
        (COUNT(l.loan_id) + COALESCE(COUNT(la.id), 0)) AS average_loan_amount
      FROM loans l
      LEFT JOIN loan_applications la ON 1 = 1
    `;

    const totalRepaidAmountQuery = `
      SELECT SUM(amount_paid) AS total_repaid_amount
      FROM payments
    `;

    const mostActiveUserQuery = `
       SELECT u.fullname, 
         COALESCE(COUNT(DISTINCT l.loan_id), 0) AS number_of_loans_borrowed, 
         COALESCE(COUNT(DISTINCT la.id), 0) AS number_of_applications
       FROM users u
       LEFT JOIN loans l ON l.customer_id = u.user_id AND YEAR(l.start_date) = YEAR(CURRENT_DATE)
       LEFT JOIN loan_applications la ON la.applicant_id = u.user_id
       GROUP BY u.user_id, u.fullname
       ORDER BY (COALESCE(COUNT(DISTINCT l.loan_id), 0) + COALESCE(COUNT(DISTINCT la.id), 0)) DESC
       LIMIT 1
     `;

    const topBorrowerQuery = `
      SELECT u.user_id, u.fullname, SUM(l.loan_amount) AS total_loan_amount
      FROM loans l
      JOIN users u ON l.customer_id = u.user_id
      WHERE YEAR(l.start_date) = YEAR(CURRENT_DATE)
      GROUP BY u.user_id, u.fullname
      ORDER BY total_loan_amount DESC
      LIMIT 1
    `;

    const totalClearedLoansQuery = `
      SELECT COUNT(*) AS total_cleared_loans
      FROM loans
      WHERE is_cleared = true
    `;

    // Execute all queries concurrently
    const [
      [totalActiveLoansResults],
      [totalCustomerBalanceResults],
      [loanApplicationsResults],
      [totalUsersResults],
      [numDelinquentLoansResults],
      [totalInterestResults],
      [monthlyCollectedInterestResults],
      [yearlyCollectedInterestResults],
      [numActiveLoansResults],
      [totalLoansIssuedResults],
      [totalAmountDisbursedResults],
      [totalAmountDisbursedCurrentMonthResults],
      [yearlyDisbursedAmountResults],
      [averageLoanAmountResults],
      [totalRepaidAmountResults],
      [mostActiveUserResults],
      [topBorrowerResults],
      [totalClearedLoansResults]
    ] = await Promise.all([
      db.promise().query(totalActiveLoansQuery),
      db.promise().query(totalCustomerBalanceQuery),
      db.promise().query(loanApplicationsQuery),
      db.promise().query(totalUsersQuery),
      db.promise().query(numDelinquentLoansQuery),
      db.promise().query(totalInterestQuery),
      db.promise().query(monthlyCollectedInterestQuery),
      db.promise().query(yearlyCollectedInterestQuery),
      db.promise().query(numActiveLoansQuery),
      db.promise().query(totalLoansIssuedQuery),
      db.promise().query(totalAmountDisbursedQuery),
      db.promise().query(totalAmountDisbursedCurrentMonthQuery),
      db.promise().query(yearlyDisbursedAmountQuery),
      db.promise().query(averageLoanAmountQuery),
      db.promise().query(totalRepaidAmountQuery),
      db.promise().query(mostActiveUserQuery),
      db.promise().query(topBorrowerQuery),
      db.promise().query(totalClearedLoansQuery)
    ]);
    

    // Extract results from the query responses
    const totalActiveLoans = totalActiveLoansResults[0].total_active_loans;
    const totalCustomerBalance = totalCustomerBalanceResults[0].total_balance || 0;
    const loanApplications = loanApplicationsResults[0].total_applications;
    const totalUsers = totalUsersResults[0].total_users;
    const numDelinquentLoans = numDelinquentLoansResults[0].num_delinquent_loans;
    const totalInterest = totalInterestResults[0].total_interest || 0;
    const monthlyCollectedInterest = monthlyCollectedInterestResults[0].monthly_collected_interest || 0;
    const yearlyCollectedInterest = yearlyCollectedInterestResults[0].yearly_collected_interest || 0;
    const numActiveLoans = numActiveLoansResults[0].num_active_loans;
    const totalLoansIssued = totalLoansIssuedResults[0].total_loans_issued;
    const totalAmountDisbursed = totalAmountDisbursedResults[0].total_amount_disbursed || 0;
    const totalAmountDisbursedCurrentMonth = totalAmountDisbursedCurrentMonthResults[0].total_amount_disbursed_current_month || 0;
    const yearlyDisbursedAmount = yearlyDisbursedAmountResults[0].yearly_disbursed_amount || 0;
    const averageLoanAmount = averageLoanAmountResults[0].average_loan_amount || 0;
    const totalRepaidAmount = totalRepaidAmountResults[0].total_repaid_amount || 0;
    const mostActiveUser = mostActiveUserResults[0] || {};
    const topBorrower = topBorrowerResults[0] || {};
    const totalClearedLoans = totalClearedLoansResults[0].total_cleared_loans;

    // Respond with the aggregated statistics and user type
    res.status(200).json({
      userType,
      totalActiveLoans,
      totalCustomerBalance,
      loanApplications,
      totalUsers,
      numDelinquentLoans,
      totalInterest,
      monthlyCollectedInterest,
      yearlyCollectedInterest,
      numActiveLoans,
      totalLoansIssued,
      totalAmountDisbursed,
      totalAmountDisbursedCurrentMonth,
      yearlyDisbursedAmount,
      averageLoanAmount,
      totalRepaidAmount,
      mostActiveUser,
      topBorrower,
      totalClearedLoans
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
