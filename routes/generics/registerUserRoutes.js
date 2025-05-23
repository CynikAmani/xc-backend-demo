const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const bcrypt = require('bcrypt');

// Route to register a new user
router.post('/', async (req, res) => {
  const { fullname, genderId, districtId, nationalIdNumber, phone, email, username, password, userType, formTriggered } = req.body;

  // Validate the input
  if (!fullname || !genderId || !districtId || !nationalIdNumber || !phone || !email || !username || !password || !userType) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Check if the user with the given username already exists
  db.query('SELECT * FROM users WHERE user_id = ?', [username], async (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    try {
      // Encrypt the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert the new user into the database, including district_id
      const newUser = {
        user_id: username,
        password: hashedPassword,
        user_type: userType,
        fullname,
        gender_id: genderId,
        national_id: nationalIdNumber,
        phone,
        email,
        district_id: districtId 
      };

      db.query('INSERT INTO users SET ?', newUser, (err, result) => {
        if (err) {
          console.error('Error inserting user:', err);
          return res.status(500).json({ message: 'Server error' });
        }

        // Insert into user_tnc_acceptance table
        const acceptanceQuery = 'INSERT INTO user_tnc_acceptance (user_id) VALUES (?)';
        db.query(acceptanceQuery, [username], (err, acceptanceResult) => {
          if (err) {
            console.error('Error inserting TnC acceptance:', err);
            return res.status(500).json({ message: 'Server error' });
          }

          if (!formTriggered) {
            // Set the session, user is creating their account
            req.session.userId = username;

            // Respond with success message
            res.status(201).json({ message: 'User registered and logged in successfully' });
          } else {
            // Respond with success message without setting session, admin is creating accouunt for the user
            res.status(201).json({ message: 'User registered successfully' });
          }
        });
      });
    } catch (error) {
      console.error('Error encrypting password:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
});

module.exports = router;
