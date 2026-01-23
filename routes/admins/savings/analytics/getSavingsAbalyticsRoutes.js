const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');

router.get('/', checkAdmin, (req, res) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
    
    const analyticsQueries = {
        // 1. Core Savings Status Breakdown
        savingsStatus: `
            SELECT 
                -- ACTIVE: still growing, not matured yet
                COUNT(CASE WHEN is_withdrawn = 0 AND return_date > NOW() THEN 1 END) as active_count,
                COALESCE(SUM(CASE WHEN is_withdrawn = 0 AND return_date > NOW() THEN return_amount ELSE 0 END), 0) as active_amount,
                
                -- MATURED: ready for withdrawal
                COUNT(CASE WHEN is_withdrawn = 0 AND return_date <= NOW() THEN 1 END) as matured_count,
                COALESCE(SUM(CASE WHEN is_withdrawn = 0 AND return_date <= NOW() THEN return_amount ELSE 0 END), 0) as matured_amount,
                
                -- WITHDRAWN: already paid out
                COUNT(CASE WHEN is_withdrawn = 1 THEN 1 END) as withdrawn_count,
                COALESCE(SUM(CASE WHEN is_withdrawn = 1 THEN return_amount ELSE 0 END), 0) as withdrawn_amount,
                
                -- Totals
                COUNT(*) as total_savings_records
            FROM savings
        `,

        // 2. Monthly Performance - Current Year, January to Current Month
        monthlyPerformance: `
            SELECT 
                DATE_FORMAT(start_date, '%Y-%m') as month,
                MONTHNAME(start_date) as month_name,
                COUNT(*) as new_savings,
                COALESCE(SUM(amount_saved), 0) as amount_saved,
                COALESCE(SUM(return_amount), 0) as expected_returns
            FROM savings
            WHERE YEAR(start_date) = ${currentYear}
            AND MONTH(start_date) <= ${currentMonth}
            GROUP BY DATE_FORMAT(start_date, '%Y-%m'), MONTHNAME(start_date)
            ORDER BY month
        `,

        // 3. Top 5 Customers
        topCustomers: `
            SELECT 
                u.fullname,
                u.phone,
                COUNT(s.savings_id) as total_savings,
                COALESCE(SUM(s.amount_saved), 0) as total_amount_saved,
                COALESCE(MAX(s.amount_saved), 0) as largest_single_saving
            FROM savings s
            JOIN users u ON s.customer_id = u.user_id
            GROUP BY s.customer_id, u.fullname, u.phone
            ORDER BY total_amount_saved DESC
            LIMIT 5
        `,

        // 4. Current Month Maturities Only
        currentMonthMaturities: `
            SELECT 
                COUNT(*) as count,
                COALESCE(SUM(return_amount), 0) as amount
            FROM savings
            WHERE is_withdrawn = 0 
            AND MONTH(return_date) = ${currentMonth}
            AND YEAR(return_date) = ${currentYear}
        `,

        // 5. Withdrawals This Month Only
        currentMonthWithdrawals: `
            SELECT 
                COUNT(*) as count,
                COALESCE(SUM(return_amount), 0) as amount
            FROM savings
            WHERE is_withdrawn = 1 
            AND MONTH(date_withdrawn) = ${currentMonth}
            AND YEAR(date_withdrawn) = ${currentYear}
        `,

        // 6. Top 3 Districts
        topDistricts: `
            SELECT 
                COALESCE(d.district_name, 'Unknown') as district,
                COUNT(s.savings_id) as savings_count,
                COALESCE(SUM(s.amount_saved), 0) as total_saved
            FROM savings s
            JOIN users u ON s.customer_id = u.user_id
            LEFT JOIN districts d ON u.district_id = d.id
            GROUP BY d.district_name
            ORDER BY total_saved DESC
            LIMIT 3
        `,

        // 7. Savings Behavior
        savingsBehavior: `
            SELECT 
                COALESCE(MAX(amount_saved), 0) as largest_single_saving,
                COALESCE(MIN(amount_saved), 0) as smallest_single_saving,
                COALESCE(AVG(amount_saved), 0) as avg_savings_amount
            FROM savings
        `,

        // 8. Year-over-Year Growth (Jan to Current Month)
        yearOverYearGrowth: `
            -- Current Year (Jan to Current Month)
            SELECT 
                ${currentYear} as year,
                'current' as period,
                COUNT(*) as savings_count,
                COALESCE(SUM(amount_saved), 0) as amount_saved
            FROM savings
            WHERE YEAR(start_date) = ${currentYear}
            AND MONTH(start_date) <= ${currentMonth}
            
            UNION ALL
            
            -- Previous Year (Same period: Jan to Current Month of last year)
            SELECT 
                ${currentYear - 1} as year,
                'previous' as period,
                COUNT(*) as savings_count,
                COALESCE(SUM(amount_saved), 0) as amount_saved
            FROM savings
            WHERE YEAR(start_date) = ${currentYear - 1}
            AND MONTH(start_date) <= ${currentMonth}
        `
    };

    // Execute all queries
    const queryPromises = Object.entries(analyticsQueries).map(([key, query]) => {
        return new Promise((resolve, reject) => {
            db.query(query, (err, results) => {
                if (err) {
                    console.error(`Error in ${key} query:`, err);
                    resolve({ [key]: [] });
                } else {
                    resolve({ [key]: results });
                }
            });
        });
    });

    Promise.all(queryPromises)
        .then(results => {
            const analyticsData = results.reduce((acc, result) => {
                return { ...acc, ...result };
            }, {});

            const savingsStatus = analyticsData.savingsStatus?.[0] || {};
            const savingsBehavior = analyticsData.savingsBehavior?.[0] || {};
            const currentMonthMaturities = analyticsData.currentMonthMaturities?.[0] || {};
            const currentMonthWithdrawals = analyticsData.currentMonthWithdrawals?.[0] || {};
            const yearOverYearGrowth = analyticsData.yearOverYearGrowth || [];
            
            const currentYearData = yearOverYearGrowth.find(y => y.period === 'current') || {};
            const previousYearData = yearOverYearGrowth.find(y => y.period === 'previous') || {};
            
            // Debug logging
            console.log('DEBUG - Savings Status Data:', {
                active_amount: savingsStatus.active_amount,
                active_amount_type: typeof savingsStatus.active_amount,
                matured_amount: savingsStatus.matured_amount,
                matured_amount_type: typeof savingsStatus.matured_amount,
                active_count: savingsStatus.active_count,
                matured_count: savingsStatus.matured_count
            });

            // Parse all values as integers to prevent string concatenation
            const activeAmount = parseInt(savingsStatus.active_amount) || 0;
            const maturedAmount = parseInt(savingsStatus.matured_amount) || 0;
            const withdrawnAmount = parseInt(savingsStatus.withdrawn_amount) || 0;
            
            console.log('DEBUG - Parsed amounts:', {
                activeAmount,
                maturedAmount,
                totalMoneyOwed: activeAmount + maturedAmount
            });

            const growthRate = (previousYearData.amount_saved > 0 && parseInt(previousYearData.amount_saved) > 0)
                ? ((parseInt(currentYearData.amount_saved) - parseInt(previousYearData.amount_saved)) / parseInt(previousYearData.amount_saved) * 100).toFixed(1)
                : (parseInt(currentYearData.amount_saved) > 0 ? 100.0 : 0);

            const processedData = {
                // Time context
                time_context: {
                    current_year: currentYear,
                    current_month: currentMonthName,
                    comparison_period: `Jan-${currentMonthName}`
                },

                // 1. Savings Status Breakdown
                savings_status: {
                    active: {
                        count: parseInt(savingsStatus.active_count) || 0,
                        amount: activeAmount
                    },
                    matured: {
                        count: parseInt(savingsStatus.matured_count) || 0,
                        amount: maturedAmount
                    },
                    withdrawn: {
                        count: parseInt(savingsStatus.withdrawn_count) || 0,
                        amount: withdrawnAmount
                    },
                    // CORRECT CALCULATION: Active + Matured amounts
                    total_money_owed: activeAmount + maturedAmount,
                    total_savings_records: parseInt(savingsStatus.total_savings_records) || 0
                },

                // 2. Monthly Performance (Current Year, Jan to Current Month)
                monthly_performance: (analyticsData.monthlyPerformance || []).map(month => ({
                    month: month.month,
                    month_name: month.month_name,
                    new_savings: parseInt(month.new_savings) || 0,
                    amount_saved: parseInt(month.amount_saved) || 0,
                    expected_returns: parseInt(month.expected_returns) || 0
                })),

                // 3. Current Month Cash Flow
                current_month: {
                    month: currentMonthName,
                    maturities: {
                        count: parseInt(currentMonthMaturities.count) || 0,
                        amount: parseInt(currentMonthMaturities.amount) || 0
                    },
                    withdrawals: {
                        count: parseInt(currentMonthWithdrawals.count) || 0,
                        amount: parseInt(currentMonthWithdrawals.amount) || 0
                    }
                },

                // 4. Customer Insights
                customer_insights: {
                    top_customers: (analyticsData.topCustomers || []).map(customer => ({
                        fullname: customer.fullname,
                        phone: customer.phone,
                        total_savings: parseInt(customer.total_savings) || 0,
                        total_amount_saved: parseInt(customer.total_amount_saved) || 0,
                        largest_single_saving: parseInt(customer.largest_single_saving) || 0
                    }))
                },

                // 5. Geographic Insights
                geographic_insights: {
                    top_areas: (analyticsData.topDistricts || []).map(area => ({
                        district: area.district,
                        savings_count: parseInt(area.savings_count) || 0,
                        total_saved: parseInt(area.total_saved) || 0
                    }))
                },

                // 6. Savings Behavior
                savings_behavior: {
                    average_savings_amount: parseInt(savingsBehavior.avg_savings_amount) || 0,
                    largest_single_saving: parseInt(savingsBehavior.largest_single_saving) || 0,
                    smallest_single_saving: parseInt(savingsBehavior.smallest_single_saving) || 0
                },

                // 7. Growth Analysis (Same period comparison)
                growth_analysis: {
                    current_year: {
                        year: parseInt(currentYearData.year) || currentYear,
                        amount_saved: parseInt(currentYearData.amount_saved) || 0,
                        savings_count: parseInt(currentYearData.savings_count) || 0
                    },
                    previous_year: {
                        year: parseInt(previousYearData.year) || (currentYear - 1),
                        amount_saved: parseInt(previousYearData.amount_saved) || 0,
                        savings_count: parseInt(previousYearData.savings_count) || 0
                    },
                    growth_percentage: parseFloat(growthRate)
                }
            };

            console.log('DEBUG - Final processed data total_money_owed:', processedData.savings_status.total_money_owed);
            
            res.status(200).json(processedData);
        })
        .catch(error => {
            console.error('Error fetching analytics:', error);
            res.status(500).json({ 
                message: 'Failed to fetch analytics data' 
            });
        });
});

module.exports = router;