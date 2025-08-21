const express = require('express');
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');
const multer = require('multer');
const path = require('path');
const router = express.Router();


// Get upload path from env (fallback to ./uploads for local dev)
const uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, 'uploads'); 

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath); 
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName); // Use a unique name for each file
  },
});

const upload = multer({ storage });

// Route to insert or update advert
router.post('/', checkAdmin, upload.single('advert_image_name'), (req, res) => {
  const { advert_content } = req.body;
  const advert_image_name = req.file ? req.file.filename : null;

  if (!advert_image_name || !advert_content) {
    return res.status(400).json({ message: 'Image and content are required.' });
  }

  // Check if an advert already exists
  const checkQuery = 'SELECT id FROM adverts LIMIT 1';
  db.query(checkQuery, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.length > 0) {
      // If an advert exists, update it
      const updateQuery = 'UPDATE adverts SET advert_image_name = ?, advert_content = ? WHERE id = ?';
      db.query(updateQuery, [advert_image_name, advert_content, results[0].id], (err) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }
        res.json({ message: 'Advert updated successfully' });
      });
    } else {
      // If no advert exists, insert a new one
      const insertQuery = 'INSERT INTO adverts (advert_image_name, advert_content) VALUES (?, ?)';
      db.query(insertQuery, [advert_image_name, advert_content], (err) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }
        res.json({ message: 'Advert inserted successfully' });
      });
    }
  });
});

module.exports = router;
