const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');

// GET current savings configuration (single record)
router.get('/', checkAdmin, (req, res) => {
    const query = `
        SELECT 
            sa.attribute_id,
            sa.interest_rate,
            sa.max_amount,
            sa.min_amount,
            sa.max_active_applications,
            sa.updated_by,
            u.fullname as updated_by_name
        FROM savings_attr sa
        JOIN users u ON sa.updated_by = u.user_id
        ORDER BY sa.attribute_id DESC
        LIMIT 1
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching savings configuration:', err);
            return res.status(500).json({ 
                message: 'Failed to fetch savings configuration' 
            });
        }

        if (results.length === 0) {
            // Return empty structure if no configuration exists
            return res.status(200).json({
                exists: false,
                data: null,
                message: 'No savings configuration found'
            });
        }

        res.status(200).json({
            exists: true,
            data: results[0]
        });
    });
});

module.exports = router;