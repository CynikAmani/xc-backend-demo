const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');
const multer = require('multer');
const path = require('path');

// Set up multer for logo image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Append current timestamp to the original file name
    }
});

const upload = multer({ storage: storage });

// Route to set or update system attributes
router.post('/', checkAdmin, upload.single('logo'), (req, res) => {
    const { systemName, slogan } = req.body;
    const logoImgName = req.file ? req.file.filename : null;

    // Query to check if a record exists
    const selectQuery = `SELECT * FROM system_info LIMIT 1`;

    db.query(selectQuery, (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        // If no record exists, insert a new one
        if (result.length === 0) {
            const insertQuery = `
                INSERT INTO system_info (system_name, slogan, logo_img_name)
                VALUES (?, ?, ?)
            `;
            db.query(insertQuery, [systemName || 'XanderCreditors', slogan || 'More than just a money lender', logoImgName || ''], (err, insertResult) => {
                if (err) {
                    console.error('Database insert error:', err);
                    return res.status(500).json({ message: 'Internal server error' });
                }
                return res.status(201).json({ message: 'System attributes set successfully' });
            });
        } else {
            // If a record exists, update it
            const { id } = result[0];
            const updateQuery = `
                UPDATE system_info
                SET system_name = ?, slogan = ?, logo_img_name = ?
                WHERE id = ?
            `;
            db.query(updateQuery, [systemName || result[0].system_name, slogan || result[0].slogan, logoImgName || result[0].logo_img_name, id], (err, updateResult) => {
                if (err) {
                    console.error('Database update error:', err);
                    return res.status(500).json({ message: 'Internal server error' });
                }
                return res.status(200).json({ message: 'System attributes updated successfully' });
            });
        }
    });
});

module.exports = router;
