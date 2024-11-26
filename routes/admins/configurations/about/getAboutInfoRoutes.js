const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');

router.get('/', (req, res) => {
  const query = `
    SELECT 
      brand_mission AS mission,
      brand_vision AS vision,
      contact_phone AS phoneNumber,
      contact_email AS email,
      whatsapp_phone AS whatsappNumber,
      core_values AS coreValues
    FROM about
    LIMIT 1;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching about details:', err);
      return res.status(500).json({ error: 'Failed to fetch about details' });
    }

    if (results.length === 0) {
      // No record found, return default state structure
      return res.json({
        mission: '',
        vision: '',
        phoneNumber: '265',
        email: '',
        whatsappNumber: '265',
        coreValues: '',
      });
    }

    // Return the first record
    res.json(results[0]);
  });
});

module.exports = router;
