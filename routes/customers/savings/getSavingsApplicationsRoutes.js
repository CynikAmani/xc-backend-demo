const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const checkSession = require('../../../auth/checkSession');
const moment = require('moment');

// GET savings applications for logged-in user
router.get('/', checkSession, (req, res) => {
    const userId = req.session?.userId;
    
    if (!userId) {
        return res.status(401).json({ 
            message: 'User not authenticated' 
        });
    }

    const query = `
        SELECT 
            application_id,
            customer_id,
            amount,
            date_applied,
            residence_location,
            is_edited
        FROM savings_applications 
        WHERE customer_id = ?
        ORDER BY date_applied DESC
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user savings applications:', err);
            return res.status(500).json({ 
                message: 'Internal server error' 
            });
        }

        // Process results with time calculations
        const applicationsWithTime = results.map(application => {
            const now = moment();
            const dateApplied = moment(application.date_applied);
            
            // Calculate time elapsed
            const daysElapsed = now.diff(dateApplied, 'days');
            const hoursElapsed = now.diff(dateApplied, 'hours') % 24;
            const minutesElapsed = now.diff(dateApplied, 'minutes') % 60;
            
            // Format the original date for display
            const formattedDate = dateApplied.format('YYYY-MM-DD HH:mm:ss');
            
            return {
                ...application,
                date_applied: formattedDate,
                time_elapsed: {
                    days: daysElapsed,
                    hours: hoursElapsed,
                    minutes: minutesElapsed,
                    display: `${daysElapsed}d ${hoursElapsed}h ${minutesElapsed}m ago`
                }
            };
        });

        res.status(200).json(applicationsWithTime);
    });
});

module.exports = router;