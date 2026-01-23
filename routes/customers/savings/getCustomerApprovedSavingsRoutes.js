const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const checkSession = require('../../../auth/checkSession');
const moment = require('moment');

// POST endpoint to get user's savings records with filtering
router.post('/', checkSession, (req, res) => {
    const userId = req.session?.userId;
    const { filter = 'active' } = req.body; // Default to 'active' if not specified

    if (!userId) {
        return res.status(401).json({ 
            message: 'User not authenticated' 
        });
    }

    if (!['active', 'matured', 'withdrawn'].includes(filter)) {
        return res.status(400).json({ 
            message: 'Valid filter required: active, matured, or withdrawn' 
        });
    }

    let baseQuery = `
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
    `;

    // Add filter conditions
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const queryParams = [userId];

    if (filter === 'active') {
        baseQuery += ' AND return_date > ? AND is_withdrawn = FALSE';
        queryParams.push(now);
    } else if (filter === 'matured') {
        baseQuery += ' AND return_date <= ? AND is_withdrawn = FALSE';
        queryParams.push(now);
    } else if (filter === 'withdrawn') {
        baseQuery += ' AND is_withdrawn = TRUE';
    }

    baseQuery += ' ORDER BY return_date ASC';

    db.query(baseQuery, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching user savings records:', err);
            return res.status(500).json({ 
                message: 'Internal server error' 
            });
        }

        // Process results
        const processedResults = results.map(savings => {
            const startDate = moment(savings.start_date);
            const returnDate = moment(savings.return_date);
            const now = moment();
            
            // Format dates for display
            const formattedStartDate = startDate.format('D MMM, YYYY');
            const formattedReturnDate = returnDate.format('D MMM, YYYY');
            const formattedWithdrawnDate = savings.date_withdrawn 
                ? moment(savings.date_withdrawn).format('D MMM, YYYY HH:mm')
                : null;

            // Time calculations based on filter
            let timeInfo = null;
            let status = filter;

            if (filter === 'active') {
                // Calculate time remaining to maturity
                const daysRemaining = returnDate.diff(now, 'days');
                const hoursRemaining = returnDate.diff(now, 'hours') % 24;
                const minutesRemaining = returnDate.diff(now, 'minutes') % 60;
                
                timeInfo = {
                    type: 'remaining',
                    days: daysRemaining,
                    hours: hoursRemaining,
                    minutes: minutesRemaining,
                    display: `${daysRemaining}d ${hoursRemaining}h ${minutesRemaining}m`
                };
            } else if (filter === 'matured') {
                // Calculate time elapsed since maturity
                const daysElapsed = now.diff(returnDate, 'days');
                const hoursElapsed = now.diff(returnDate, 'hours') % 24;
                const minutesElapsed = now.diff(returnDate, 'minutes') % 60;
                
                timeInfo = {
                    type: 'elapsed',
                    days: daysElapsed,
                    hours: hoursElapsed,
                    minutes: minutesElapsed,
                    display: `${daysElapsed}d ${hoursElapsed}h ${minutesElapsed}m ago`
                };
                status = 'ready'; // Special status for matured but not withdrawn
            } else if (filter === 'withdrawn') {
                // Calculate time since withdrawal
                const daysSince = now.diff(moment(savings.date_withdrawn), 'days');
                const hoursSince = now.diff(moment(savings.date_withdrawn), 'hours') % 24;
                const minutesSince = now.diff(moment(savings.date_withdrawn), 'minutes') % 60;
                
                timeInfo = {
                    type: 'since_withdrawal',
                    days: daysSince,
                    hours: hoursSince,
                    minutes: minutesSince,
                    display: `${daysSince}d ${hoursSince}h ${minutesSince}m ago`
                };
            }

            return {
                savings_id: savings.savings_id,
                amount_saved: savings.amount_saved,
                interest_rate: savings.interest_rate,
                return_amount: savings.return_amount,
                is_withdrawn: savings.is_withdrawn,
                status: status,
                dates: {
                    start_date: formattedStartDate,
                    return_date: formattedReturnDate,
                    date_withdrawn: formattedWithdrawnDate,
                    start_time: startDate.format('HH:mm'),
                    return_time: returnDate.format('HH:mm')
                },
                time_info: timeInfo,
                raw_dates: {
                    start: savings.start_date,
                    return: savings.return_date,
                    withdrawn: savings.date_withdrawn
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