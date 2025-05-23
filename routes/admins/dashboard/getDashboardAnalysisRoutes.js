const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
checkAdmin = require('../../../auth/checkAdmin');

/**
 * 1. Gender Analysis of Customers
 * Includes total counts and handles potential NULL genders
 */
router.get('/gender-analysis', checkAdmin, async (req, res) => {
  try {
    const query = `
      WITH customer_counts AS (
        SELECT 
          g.gender,
          COUNT(u.user_id) AS count
        FROM users u
        LEFT JOIN genders g ON u.gender_id = g.gender_id
        WHERE u.user_type = 'customer'
        GROUP BY g.gender
      ),
      total_customers AS (
        SELECT COUNT(*) AS total FROM users WHERE user_type = 'customer'
      )
      SELECT 
        COALESCE(cc.gender, 'Unknown') AS gender,
        cc.count,
        ROUND(cc.count * 100.0 / tc.total, 2) AS percentage 
      FROM customer_counts cc
      CROSS JOIN total_customers tc
      UNION ALL
      SELECT 
        'Total' AS gender,
        tc.total AS count,
        100.00 AS percentage
      FROM total_customers tc
      ORDER BY CASE WHEN gender = 'Total' THEN 1 ELSE 0 END, count DESC
    `;

    const [results] = await db.promise().query(query);
    
    res.status(200).json({
      success: true,
      data: {
        breakdown: results.filter(r => r.gender !== 'Total'),
        summary: results.find(r => r.gender === 'Total')
      }
    });
  } catch (err) {
    console.error('Gender analysis error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch gender analysis',
      error: err.message 
    });
  }
});

/**
 * 2. District-Wise User Distribution
 * Includes unknown districts and total percentage
 */
router.get('/district-distribution', checkAdmin, async (req, res) => {
  try {
    const query = `
      WITH district_counts AS (
        SELECT 
          COALESCE(d.district_name, 'Unknown') AS district,
          COUNT(u.user_id) AS user_count
        FROM users u
        LEFT JOIN districts d ON u.district_id = d.id
        GROUP BY d.district_name
      ),
      total_users AS (
        SELECT COUNT(*) AS total FROM users
      )
      SELECT 
        district,
        user_count,
        ROUND(user_count * 100.0 / (SELECT total FROM total_users), 2) AS percentage
      FROM district_counts
      ORDER BY user_count DESC
      LIMIT 10
    `;

    const [topDistricts] = await db.promise().query(query);
    const [total] = await db.promise().query('SELECT COUNT(*) AS total FROM users');

    res.status(200).json({
      success: true,
      data: {
        topDistricts,
        totalUsers: total[0].total
      }
    });
  } catch (err) {
    console.error('District distribution error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch district distribution',
      error: err.message 
    });
  }
});


// Helper function for percentage change calculation
function percentageChange(oldValue, newValue) {
  if (oldValue === 0) return null;
  return ((newValue - oldValue) / oldValue * 100).toFixed(2);
}
 
module.exports = router;