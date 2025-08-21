const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../../config/db'); 
const checkSession = require('../../auth/checkSession'); 

// Get upload path from env (fallback to ./uploads for local dev)
const uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, 'uploads'); 


const router = express.Router();

// Set up multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath); // Directory to save uploaded files
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext); // Generate unique filename
  }
});

const upload = multer({ storage });

// Route to update display picture
router.post('/', checkSession, upload.single('dp'), (req, res) => {
  const userId = req.session.userId;
  const dpPath = req.file ? req.file.filename : null;

  if (!dpPath) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const query = 'UPDATE users SET dp = ? WHERE user_id = ?';
  db.query(query, [dpPath, userId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    res.json({ message: 'Display picture updated successfully' });
  });
});

module.exports = router;
