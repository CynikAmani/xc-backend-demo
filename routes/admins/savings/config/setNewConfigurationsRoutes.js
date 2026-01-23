const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');

// POST set/update savings configuration (single record system)
router.post('/', checkAdmin, (req, res) => {
    const { interest_rate, max_amount, min_amount, max_active_applications } = req.body;
    const updated_by = req.session.userId;

    if (!interest_rate || !max_amount || !min_amount || !max_active_applications || !updated_by) {
        return res.status(400).json({ 
            success: false,
            message: 'All fields are required' 
        });
    }

    // Validation
    if (parseFloat(min_amount) >= parseFloat(max_amount)) {
        return res.status(400).json({ 
            success: false,
            message: 'Minimum amount must be less than maximum amount' 
        });
    }

    if (parseInt(interest_rate) <= 0) {
        return res.status(400).json({ 
            success: false,
            message: 'Interest rate must be greater than 0' 
        });
    }

    if (parseInt(max_active_applications) <= 0) {
        return res.status(400).json({ 
            success: false,
            message: 'Maximum active applications must be greater than 0' 
        });
    }

    // First, check if a configuration exists
    const checkQuery = 'SELECT attribute_id FROM savings_attr ORDER BY attribute_id DESC LIMIT 1';
    
    db.query(checkQuery, (checkErr, checkResults) => {
        if (checkErr) {
            console.error('Error checking existing configuration:', checkErr);
            return res.status(500).json({ 
                success: false,
                message: 'Failed to check existing configuration' 
            });
        }

        if (checkResults.length > 0) {
            // UPDATE existing configuration
            const updateQuery = `
                UPDATE savings_attr 
                SET interest_rate = ?, 
                    max_amount = ?, 
                    min_amount = ?, 
                    max_active_applications = ?, 
                    updated_by = ?
                WHERE attribute_id = ?
            `;
            
            db.query(updateQuery, [
                interest_rate, 
                max_amount, 
                min_amount, 
                max_active_applications, 
                updated_by,
                checkResults[0].attribute_id
            ], (updateErr, updateResult) => {
                if (updateErr) {
                    console.error('Error updating savings configuration:', updateErr);
                    return res.status(500).json({ 
                        success: false,
                        message: 'Failed to update savings configuration' 
                    });
                }

                res.status(200).json({ 
                    success: true,
                    action: 'updated',
                    message: 'Savings configuration updated successfully'
                });
            });
        } else {
            // CREATE new configuration
            const insertQuery = `
                INSERT INTO savings_attr 
                (interest_rate, max_amount, min_amount, max_active_applications, updated_by) 
                VALUES (?, ?, ?, ?, ?)
            `;
            
            db.query(insertQuery, [
                interest_rate, 
                max_amount, 
                min_amount, 
                max_active_applications, 
                updated_by
            ], (insertErr, insertResult) => {
                if (insertErr) {
                    console.error('Error creating savings configuration:', insertErr);
                    return res.status(500).json({ 
                        success: false,
                        message: 'Failed to create savings configuration' 
                    });
                }

                res.status(200).json({ 
                    success: true,
                    action: 'created',
                    message: 'Savings configuration created successfully'
                });
            });
        }
    });
});

module.exports = router;