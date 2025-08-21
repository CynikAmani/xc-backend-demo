const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');
const router = express.Router();

// Get upload path from env (fallback to ./uploads for local dev)
const uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, 'uploads');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath); 
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext); // Unique filename
  }
});

const upload = multer({ storage });

// Route to insert a brand image
router.post('/', checkAdmin, upload.single('brand_image'), (req, res) => {
  const brand_image_name = req.file ? req.file.filename : null;

  if (!brand_image_name) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const query = 'INSERT INTO brand_images (brand_image_name) VALUES (?)';
  db.query(query, [brand_image_name], (err) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    res.json({ message: 'Brand image inserted successfully' });
  });
});

module.exports = router;
