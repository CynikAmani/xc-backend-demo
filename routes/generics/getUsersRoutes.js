const express = require('express');
const router = express.Router();
const db = require('../../config/db');
checkAdmin = require('../../auth/checkAdmin');

router.get('/', checkAdmin, (req, res) => {
  const loggedInUserId = req.session.userId;

  const query = `
    SELECT 
      fullname AS name,
      (SELECT gender FROM genders WHERE gender_id = users.gender_id) AS gender,
      user_id AS username,
      user_type AS userType,
      national_id AS nationalIdNumber,
      phone,
      email,
      gender_id,
      is_blocked,
      dp,
      districts.district_name AS district
    FROM users
    LEFT JOIN districts ON users.district_id = districts.id
    WHERE user_id != ?
  `;

  db.query(query, [loggedInUserId], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    const users = results.map(row => ({
      name: row.name,
      gender: row.gender,
      genderId: row.gender_id,
      username: row.username,
      userType: row.userType,
      nationalIdNumber: row.nationalIdNumber,
      phone: row.phone,
      email: row.email,
      isBlocked: row.is_blocked,
      dp: row.dp,
      district: row.district || null  // if no district, return null
    }));

    res.status(200).json(users);
  });
});

module.exports = router;
