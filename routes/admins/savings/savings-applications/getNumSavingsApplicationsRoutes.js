const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkSession = require('../../../../auth/checkSession');

// GET count of savings applications
router.get('/', checkSession, (req, res) => {
    const query = 'SELECT COUNT(*) as total_savings_applications FROM savings_applications';

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error counting savings applications:', err);
            return res.status(500).json({ 
                message: 'Failed to count applications' 
            });
        }

        const count = results[0]?.total_savings_applications || 0;
        
        res.status(200).json({
            count: count,
            message: `Total savings applications: ${count}`
        });
    });
});

module.exports = router;