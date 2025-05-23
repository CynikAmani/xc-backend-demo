const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const checkSession = require('../../../auth/checkSession');


router.post('/', checkSession, (req, res) => {
    const userId = req.session?.userId;
    const { districtId } = req.body;

    if (!districtId) {
        return res.status(400).json({ message: 'District ID is required.' });
    }

    const sql = `
        UPDATE users
        SET district_id = ?
        WHERE user_id = ?
    `;

    db.query(sql, [districtId, userId], (error, results) => {
        if (error) {
            console.error('Error updating residential district:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({ message: 'Residential district updated successfully.' });
    });
});

module.exports = router;
