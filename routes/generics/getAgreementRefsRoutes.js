const express = require('express');
const db = require('../../config/db');
const checkSession = require('../../auth/checkSession');

const router = express.Router();

// Route to get agreement references
router.post('/', checkSession, (req, res) => {

  const userId = req.body.userId || req.session.userId;
  console.log('Received request for agreement references with userId:', userId);

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
