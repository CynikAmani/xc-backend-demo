const express = require('express');
const router = express.Router();
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');

router.post('/', checkAdmin, (req, res) => {
  const { mission, vision, phoneNumber, email, whatsappNumber, coreValues } = req.body;

  // Validate all fields
  if (!mission || !vision || !phoneNumber || !email || !whatsappNumber || !coreValues) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Check if a record exists
  const checkQuery = 'SELECT id FROM about LIMIT 1';
  db.query(checkQuery, (checkErr, results) => {
    if (checkErr) {
      console.error('Error checking existing record:', checkErr);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (results.length > 0) {
      // Update the existing record
      const updateQuery = `
        UPDATE about 
        SET brand_mission = ?, brand_vision = ?, contact_phone = ?, whatsapp_phone = ?, contact_email = ?, core_values = ? 
        WHERE id = ?
      `;
      const updateValues = [
        mission,
        vision,
        phoneNumber,
        whatsappNumber,
        email,
        coreValues,
        results[0].id
      ];

      db.query(updateQuery, updateValues, (updateErr) => {
        if (updateErr) {
          console.error('Error updating record:', updateErr);
          return res.status(500).json({ error: 'Failed to update about details' });
        }

        return res.status(200).json({ message: 'About details updated successfully' });
      });
    } else {
      // Insert a new record
      const insertQuery = `
        INSERT INTO about (brand_mission, brand_vision, contact_phone, whatsapp_phone, contact_email, core_values) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const insertValues = [
        mission,
        vision,
        phoneNumber,
        whatsappNumber,
        email,
        coreValues
      ];

      db.query(insertQuery, insertValues, (insertErr) => {
        if (insertErr) {
          console.error('Error inserting new record:', insertErr);
          return res.status(500).json({ error: 'Failed to add about details' });
        }

        return res.status(201).json({ message: 'About details added successfully' });
      });
    }
  });
});

module.exports = router;
