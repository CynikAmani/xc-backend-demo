const express = require('express');
const db = require('../../config/db');
const checkSession = require('../../auth/checkSession');

const router = express.Router();

// Route to get agreement references
router.post('/', checkSession, (req, res) => {
  let { userId } = req.body; // Extract userId from the request body

  if (!userId) {
    // If userId is not provided in the body, get it from the session
    userId = req.session.userId;
  }

  // Ensure userId is available
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  const query = `
    SELECT national_id_img_name, signature_data 
    FROM agreement_refs 
    WHERE user_id = ?;`;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'No agreement references found for this user' });
    }

    const { national_id_img_name, signature_data } = results[0];
    res.json({
      nationalIdImgName: national_id_img_name,
      signatureData: signature_data ? signature_data.toString() : null,
    });
  });
});

module.exports = router;
