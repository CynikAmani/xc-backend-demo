const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const checkSession = require('../../../auth/checkSession');

router.post('/', checkSession, (req, res) => {
    const userId = req.session?.userId;
    const { amount, residenceLocation } = req.body;

    // Validate required fields
    if (!amount || !residenceLocation) {
        return res.status(400).json({ 
            message: 'Amount and residence location are required.' 
        });
    }

    // Validate amount is a number
    const amountNum = parseInt(amount);
    if (isNaN(amountNum)) {
        return res.status(400).json({ 
            message: 'Amount must be a valid number.' 
        });
    }

    // Validate minimum amount (500,000 as per frontend)
    if (amountNum < 500000) {
        return res.status(400).json({ 
            message: 'Minimum savings amount is 500,000 MWK.' 
        });
    }

    // Step 1: Get max active applications from savings_attr
    const getMaxActiveQuery = `SELECT max_active_applications FROM savings_attr ORDER BY attribute_id DESC LIMIT 1`;
    
    db.query(getMaxActiveQuery, (maxErr, maxResults) => {
        if (maxErr) {
            console.error('Error fetching max active applications:', maxErr);
            return res.status(500).json({ 
                message: 'Internal server error' 
            });
        }

        if (maxResults.length === 0) {
            return res.status(500).json({ 
                message: 'Savings system not properly configured. Please contact administrator.' 
            });
        }

        const maxActive = maxResults[0].max_active_applications || 3;

        // Step 2: Count active applications and savings for this user
        const getCurrentCountQuery = `
            SELECT 
                (SELECT COUNT(*) FROM savings_applications WHERE customer_id = ?) as pending_apps,
                (SELECT COUNT(*) FROM savings WHERE customer_id = ? AND return_date > NOW()) as active_savings
        `;

        db.query(getCurrentCountQuery, [userId, userId], (countErr, countResults) => {
            if (countErr) {
                console.error('Error counting user applications/savings:', countErr);
                return res.status(500).json({ 
                    message: 'Internal server error' 
                });
            }

            if (countResults.length === 0) {
                return res.status(500).json({ 
                    message: 'Could not retrieve user information' 
                });
            }

            const { pending_apps, active_savings } = countResults[0];
            const totalActive = (pending_apps || 0) + (active_savings || 0);

            // Check if user has reached max limit
            if (totalActive >= maxActive) {
                return res.status(400).json({ 
                    message: `Maximum active applications limit reached: Maximum is (${maxActive}).` 
                });
            }

            // Step 3: Insert savings application
            const insertApplicationQuery = `
                INSERT INTO savings_applications (customer_id, amount, residence_location)
                VALUES (?, ?, ?)
            `;

            db.query(insertApplicationQuery, [userId, amountNum, residenceLocation], (insertErr, insertResults) => {
                if (insertErr) {
                    console.error('Error inserting savings application:', insertErr);
                    return res.status(500).json({ 
                        message: 'Internal server error' 
                    });
                }

                // Step 4: Update or create application activity record
                const updateActivityQuery = `
                    INSERT INTO application_activity (customer_id, last_application_date, num_applications)
                    VALUES (?, NOW(), 1)
                    ON DUPLICATE KEY UPDATE 
                        last_application_date = NOW(),
                        num_applications = num_applications + 1
                `;

                db.query(updateActivityQuery, [userId], (activityErr, activityResults) => {
                    if (activityErr) {
                        console.error('Error updating application activity:', activityErr);
                        return res.status(500).json({ 
                            message: 'Internal server error' 
                        });
                    }

                    res.status(201).json({ 
                        message: 'Savings application submitted successfully.',
                        applicationId: insertResults.insertId
                    });
                });
            });
        });
    });
});

module.exports = router;