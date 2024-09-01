const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');

// Route to get system attributes and total users
router.get('/', (req, res) => {
    const systemQuery = `SELECT system_name, slogan, logo_img_name FROM system_info LIMIT 1`;
    const usersCountQuery = `SELECT COUNT(*) AS totalUsers FROM users`;

    // Execute both queries in parallel
    Promise.all([
        new Promise((resolve, reject) => {
            db.query(systemQuery, (err, result) => {
                if (err) return reject(err);
                resolve(result.length > 0 ? result[0] : null);  // Return null if no system attributes
            });
        }),
        new Promise((resolve, reject) => {
            db.query(usersCountQuery, (err, result) => {
                if (err) return reject(err);
                resolve(result[0].totalUsers);
            });
        })
    ])
    .then(([systemAttributes, totalUsers]) => {
        // Respond with system attributes (or empty defaults) and total users count
        res.status(200).json({
            systemName: systemAttributes ? systemAttributes.system_name : '',
            slogan: systemAttributes ? systemAttributes.slogan : '',
            logoImgName: systemAttributes ? systemAttributes.logo_img_name : '',
            totalUsers: totalUsers
        });
    })
    .catch(err => {
        console.error('Database query error:', err);
        res.status(500).json({ message: 'Internal server error' });
    });
});

module.exports = router;
