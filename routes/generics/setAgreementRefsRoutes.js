const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../../config/db'); 
const checkSession = require('../../auth/checkSession'); 

const router = express.Router();

// Set up multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directory to save uploaded files
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext); // Generate unique filename
  }
});

const upload = multer({ storage });

// Route to save or update agreement references
router.post('/', checkSession, upload.single('national_id_img'), (req, res) => {
  const userId = req.session.userId;
  const nationalIdImg = req.file ? req.file.filename : null;
  const signatureData = req.body.signature; // Expect Base64 string from the frontend

  if (!nationalIdImg || !signatureData) {
    return res.status(400).json({ message: 'Both national ID image and signature are required' });
  }

  const queryCheck = 'SELECT id FROM agreement_refs WHERE user_id = ?';
  db.query(queryCheck, [userId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.length > 0) {
      // Update existing record
      const queryUpdate = `
        UPDATE agreement_refs 
        SET national_id_img_name = ?, signature_data = ?
        WHERE user_id = ?`;
      db.query(queryUpdate, [nationalIdImg, signatureData, userId], (updateErr) => {
        if (updateErr) {
          console.error('Database update error:', updateErr);
          return res.status(500).json({ message: 'Internal server error' });
        }
        return res.json({ message: 'Agreement references updated successfully' });
      });
    } else {
      // Insert new record
      const queryInsert = `
        INSERT INTO agreement_refs (user_id, national_id_img_name, signature_data)
        VALUES (?, ?, ?)`;
      db.query(queryInsert, [userId, nationalIdImg, signatureData], (insertErr) => {
        if (insertErr) {
          console.error('Database insert error:', insertErr);
          return res.status(500).json({ message: 'Internal server error' });
        }
        return res.json({ message: 'Agreement references saved successfully' });
      });
    }
  });
});

module.exports = router;