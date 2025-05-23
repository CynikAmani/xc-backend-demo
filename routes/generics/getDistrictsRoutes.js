const express = require('express');
const router = express.Router();
const db = require('../../config/db');

router.get('/', (req, res) => {
    const sql = 'SELECT id, district_name FROM districts';

    db.query(sql, (error, results) => {
        if (error) {
            console.error('Error fetching districts:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }

        const districts = results.map( row => ({
            id: row.id,
            label: row.district_name
        }));

        res.status(200).json(districts);
    });
});

module.exports = router;
