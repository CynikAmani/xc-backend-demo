const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const moment = require('moment');
const checkAdmin = require('../../../../auth/checkAdmin');

// GET all savings applications for management with detailed information
router.get('/', checkAdmin, (req, res) => {
    const query = `
        SELECT 
            sa.application_id,
            sa.amount,
            sa.date_applied,
            sa.residence_location,
            sa.is_edited,
            u.fullname,
            u.user_id AS username,
            u.phone,
            d.district_name,
            sav.interest_rate
        FROM savings_applications sa
        JOIN users u ON sa.customer_id = u.user_id
        LEFT JOIN districts d ON u.district_id = d.id
        LEFT JOIN savings_attr sav ON (
            SELECT attribute_id 
            FROM savings_attr 
            ORDER BY attribute_id DESC 
            LIMIT 1
        ) = sav.attribute_id
        ORDER BY sa.date_applied DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching management savings applications:', err);
            return res.status(500).json({ 
                message: 'Internal server error' 
            });
        }

        // Process results with time calculations and clean structure
        const applicationsWithDetails = results.map(application => {
            const now = moment();
            const dateApplied = moment(application.date_applied);
            
            // Calculate time elapsed
            const daysElapsed = now.diff(dateApplied, 'days');
            const hoursElapsed = now.diff(dateApplied, 'hours') % 24;
            const minutesElapsed = now.diff(dateApplied, 'minutes') % 60;
            
            // Format the original date for display
            const formattedDate = dateApplied.format('YYYY-MM-DD HH:mm:ss');
            
            return {
                application_id: application.application_id,
                amount: application.amount,
                date_applied: formattedDate,
                residence_location: application.residence_location,
                is_edited: application.is_edited,
                time_elapsed: {
                    days: daysElapsed,
                    hours: hoursElapsed,
                    minutes: minutesElapsed,
                    display: `${daysElapsed}d ${hoursElapsed}h ${minutesElapsed}m ago`
                },
                applicant: {
                    fullname: application.fullname,
                    phone: application.phone,
                    district: application.district_name || 'Not specified',
                    username: application.username
                },
                savings_attributes: {
                    interest_rate: application.interest_rate
                }
            };
        });

        res.status(200).json(applicationsWithDetails);
    });
});

module.exports = router;