const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const checkSession = require('../../../auth/checkSession');
const moment = require('moment');

// GET comprehensive customer savings statistics
router.get('/stats', checkSession, (req, res) => {
    const userId = req.session?.userId;
    
    if (!userId) {
        return res.status(401).json({ 
            message: 'User not authenticated' 
        });
    }

    // First, get activity data
    const activityQuery = `
        SELECT 
            num_applications,
            last_application_date,
            last_approved_application_date
        FROM application_activity 
        WHERE customer_id = ?
    `;

    db.query(activityQuery, [userId], (activityErr, activityResults) => {
        if (activityErr) {
            console.error('Error fetching activity data:', activityErr);
            return res.status(500).json({ 
                message: 'Internal server error' 
            });
        }

        // Get pending applications
        const pendingQuery = `
            SELECT COUNT(*) as pending_count
            FROM savings_applications 
            WHERE customer_id = ?
        `;

        db.query(pendingQuery, [userId], (pendingErr, pendingResults) => {
            if (pendingErr) {
                console.error('Error fetching pending applications:', pendingErr);
                return res.status(500).json({ 
                    message: 'Internal server error' 
                });
            }

            // Get all savings data
            const savingsQuery = `
                SELECT 
                    savings_id,
                    amount_saved,
                    interest_rate,
                    return_amount,
                    start_date,
                    return_date,
                    is_withdrawn,
                    date_withdrawn
                FROM savings 
                WHERE customer_id = ?
                ORDER BY start_date DESC
            `;

            db.query(savingsQuery, [userId], (savingsErr, savingsResults) => {
                if (savingsErr) {
                    console.error('Error fetching savings data:', savingsErr);
                    return res.status(500).json({ 
                        message: 'Internal server error' 
                    });
                }

                // Calculate stats from the data
                const activity = activityResults[0] || { 
                    num_applications: 0, 
                    last_application_date: null, 
                    last_approved_application_date: null 
                };
                const pendingCount = pendingResults[0]?.pending_count || 0;
                
                let totalAmountSaved = 0;
                let totalExpectedReturns = 0;
                let totalCollectedProfit = 0;
                let maturedReadyAmount = 0;
                let totalEarnedInterest = 0;
                
                let activeCount = 0;
                let maturedNotWithdrawnCount = 0;
                let withdrawnCount = 0;
                
                let nextMaturityDate = null;
                const now = moment();

                savingsResults.forEach(saving => {
                    totalAmountSaved += saving.amount_saved;
                    const profit = saving.return_amount - saving.amount_saved;
                    totalEarnedInterest += profit;
                    
                    if (saving.is_withdrawn) {
                        withdrawnCount++;
                        totalCollectedProfit += profit;
                    } else {
                        totalExpectedReturns += saving.return_amount;
                        
                        if (moment(saving.return_date).isAfter(now)) {
                            // Active savings
                            activeCount++;
                            // Find the closest next maturity date
                            if (!nextMaturityDate || moment(saving.return_date).isBefore(nextMaturityDate)) {
                                nextMaturityDate = saving.return_date;
                            }
                        } else {
                            // Matured but not withdrawn
                            maturedNotWithdrawnCount++;
                            maturedReadyAmount += saving.return_amount;
                        }
                    }
                });

                // Calculate approved total
                const approvedTotal = activeCount + maturedNotWithdrawnCount + withdrawnCount;
                
                // Calculate declined applications
                const declinedApplications = Math.max(0, activity.num_applications - pendingCount - approvedTotal);
                
                // Calculate days since dates
                let daysSinceLastApplication = null;
                let lastApplicationDateStr = null;
                if (activity.last_application_date) {
                    daysSinceLastApplication = now.diff(moment(activity.last_application_date), 'days');
                    lastApplicationDateStr = moment(activity.last_application_date).format('MMM D, YYYY');
                }

                let daysSinceLastApproval = null;
                let lastApprovalDateStr = null;
                if (activity.last_approved_application_date) {
                    daysSinceLastApproval = now.diff(moment(activity.last_approved_application_date), 'days');
                    lastApprovalDateStr = moment(activity.last_approved_application_date).format('MMM D, YYYY');
                }

                // Days to next maturity
                let daysToNextMaturity = null;
                let nextMaturityDateStr = null;
                if (nextMaturityDate) {
                    daysToNextMaturity = moment(nextMaturityDate).diff(now, 'days');
                    if (daysToNextMaturity < 0) daysToNextMaturity = 0;
                    nextMaturityDateStr = moment(nextMaturityDate).format('MMM D, YYYY');
                }

                // Average savings amount
                const totalSavingsCount = approvedTotal;
                const averageSavingsAmount = totalSavingsCount > 0 
                    ? Math.round(totalAmountSaved / totalSavingsCount) 
                    : 0;

                // Total portfolio value
                const totalPortfolioValue = totalExpectedReturns + totalCollectedProfit;

                // Approval rate (realistic calculation)
                const approvalRate = activity.num_applications > 0 
                    ? Math.round((approvedTotal / activity.num_applications) * 100) 
                    : 0;

                const formattedStats = {
                    applications: {
                        total: activity.num_applications || 0,
                        pending: pendingCount,
                        approved: {
                            active: activeCount,
                            matured_not_withdrawn: maturedNotWithdrawnCount,
                            withdrawn: withdrawnCount,
                            total: approvedTotal
                        },
                        declined: declinedApplications
                    },
                    savings: {
                        total_amount_saved: totalAmountSaved,
                        total_expected_returns: totalExpectedReturns,
                        total_collected_profit: totalCollectedProfit,
                        matured_ready: {
                            amount: maturedReadyAmount,
                            count: maturedNotWithdrawnCount
                        },
                        next_maturity_date: nextMaturityDate,
                        next_maturity_date_formatted: nextMaturityDateStr
                    },
                    financial: {
                        total_earned_interest: totalEarnedInterest,
                        total_portfolio_value: totalPortfolioValue,
                        average_savings_amount: averageSavingsAmount
                    },
                    time: {
                        days_since_last_application: daysSinceLastApplication,
                        last_application_date: lastApplicationDateStr,
                        days_since_last_approval: daysSinceLastApproval,
                        last_approval_date: lastApprovalDateStr,
                        days_to_next_maturity: daysToNextMaturity,
                        next_maturity_date: nextMaturityDateStr
                    },
                    approval_rate: approvalRate
                };

                res.status(200).json(formattedStats);
            });
        });
    });
});

module.exports = router;