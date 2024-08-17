const express = require('express');
const router = express.Router();
const db = require('../../config/db'); 
const checkSession = require('../../auth/checkSession'); 

// Route to get user details
router.get('/', checkSession, (req, res) => {
    const userId = req.session.userId;

    const query = `
        SELECT 
            u.user_id AS userId,
            u.password,
            u.user_type AS userType,
            u.fullname,
            u.gender_id AS genderId,
            g.gender AS gender, 
            u.national_id AS nationalId,
            u.phone,
            u.email,
            u.is_blocked AS isBlocked,
            u.dp
        FROM users u
        LEFT JOIN genders g ON u.gender_id = g.gender_id  -- Join with genders table
        WHERE u.user_id = ?
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Assuming there's only one result
        const userDetails = results[0];

        res.status(200).json(userDetails);
    });
});

module.exports = router;
