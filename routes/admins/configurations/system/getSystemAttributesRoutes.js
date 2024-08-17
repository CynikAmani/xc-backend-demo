const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkSession = require('../../../../auth/checkSession');

// Route to get system attributes
router.get('/', checkSession, (req, res) => {
    const query = `SELECT system_name, slogan, logo_img_name FROM system LIMIT 1`;

    db.query(query, (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (result.length === 0) {
            return res.status(200).json({
                systemName: '',
                slogan: '',
                logoImgName:''
            });
        }

        const systemAttributes = result[0];

        res.status(200).json({
            systemName: systemAttributes.system_name,
            slogan: systemAttributes.slogan,
            logoImgName: systemAttributes.logo_img_name
        });
    });
});

module.exports = router;
