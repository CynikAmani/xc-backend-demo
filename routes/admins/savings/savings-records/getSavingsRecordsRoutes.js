const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');
const moment = require('moment');

// GET approved savings applications
router.get('/:filter', checkAdmin, (req, res) => {
    const filter = req.params.filter; // 'active', 'matured', or 'withdrawn'
    
    if (!['active', 'matured', 'withdrawn'].includes(filter)) {
        return res.status(400).json({ 
            message: 'Invalid filter. Use "active", "matured", or "withdrawn"' 
        });
    }

    // Build the base query
    let baseQuery = `
        SELECT 
            s.savings_id,
            s.customer_id,
            s.amount_saved,
            s.interest_rate,
            s.return_amount,
            s.start_date,
            s.return_date,
            s.is_withdrawn,
            s.date_withdrawn,
            u.fullname,
            u.phone,
            u.user_id as username,
            d.district_name
        FROM savings s
        JOIN users u ON s.customer_id = u.user_id
        LEFT JOIN districts d ON u.district_id = d.id
        WHERE 1=1
    `;

    // Add filter conditions
    if (filter === 'active') {
        baseQuery += ' AND s.is_withdrawn = FALSE AND s.return_date > NOW()';
    } else if (filter === 'matured') {
        baseQuery += ' AND s.is_withdrawn = FALSE AND s.return_date <= NOW()';
    } else if (filter === 'withdrawn') {
        baseQuery += ' AND s.is_withdrawn = TRUE';
    }

    // Set order based on filter
    if (filter === 'withdrawn') {
        baseQuery += ' ORDER BY s.date_withdrawn DESC';
    } else {
        baseQuery += ' ORDER BY s.return_date ASC';
    }

    db.query(baseQuery, (err, results) => {
        if (err) {
            console.error('Error fetching savings applications:', err);
            return res.status(500).json({ 
                message: 'Internal server error' 
            });
        }

        // Process results
        const processedResults = results.map(savings => {
            const startDate = moment(savings.start_date);
            const returnDate = moment(savings.return_date);
            const now = moment();
            
            // Format dates
            const formattedStartDate = startDate.format('D MMM, YYYY HH:mm');
            const formattedReturnDate = returnDate.format('D MMM, YYYY HH:mm');
            
            // Format withdrawal date if it exists
            let formattedWithdrawalDate = null;
            if (savings.date_withdrawn) {
                formattedWithdrawalDate = moment(savings.date_withdrawn).format('D MMM, YYYY HH:mm');
            }
            
            // Only calculate remaining time for active savings
            let timeRemaining = null;
            if (filter === 'active') {
                const daysRemaining = returnDate.diff(now, 'days');
                const hoursRemaining = returnDate.diff(now, 'hours') % 24;
                const minutesRemaining = returnDate.diff(now, 'minutes') % 60;
                
                timeRemaining = {
                    days: daysRemaining,
                    hours: hoursRemaining,
                    minutes: minutesRemaining,
                    display: `${daysRemaining}d ${hoursRemaining}h ${minutesRemaining}m`
                };
            }

            return {
                savings_id: savings.savings_id,
                amount_saved: savings.amount_saved,
                interest_rate: savings.interest_rate,
                return_amount: savings.return_amount,
                is_withdrawn: savings.is_withdrawn,
                dates: {
                    start_date: formattedStartDate,
                    return_date: formattedReturnDate,
                    date_withdrawn: formattedWithdrawalDate
                },
                time_remaining: timeRemaining, // Only for active savings, null for others
                applicant: {
                    fullname: savings.fullname,
                    phone: savings.phone,
                    username: savings.username,
                    district: savings.district_name || 'Not specified'
                }
            };
        });

        res.status(200).json({
            filter: filter,
            count: processedResults.length,
            data: processedResults
        });
    });
});

module.exports = router;