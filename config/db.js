const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();
const { createTablesQueries, insertInitialDataQueries } = require('./dbInitialQueries');

// Create a MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true, // This allows executing multiple statements in one query
});

// Connect to MySQL server
db.connect(err => {
  if (err) {
    console.error('MySQL connection failed:', err.stack);
    return;
  }
  console.log('Connected to MySQL server.');

  // Initialize the database (create tables)
  initializeDatabase();
});

function initializeDatabase() {
  // Create tables
  const createTablePromises = createTablesQueries.map(query => 
    new Promise((resolve, reject) => {
      db.query(query, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    })
  );

  Promise.all(createTablePromises)
    .then(() => {
      console.log('Database tables created successfully.');
      // After creating tables, check and insert initial data if necessary
      insertInitialDataIfNeeded();
    })
    .catch(err => {
      console.error('Error initializing database:', err.stack);
    });
}

function insertInitialDataIfNeeded() {
  // Check if there are records in `genders` and `messages` tables
  const checkDataQuery = `
    SELECT 1 FROM genders LIMIT 1;
    SELECT 1 FROM messages LIMIT 1;
  `;

  db.query(checkDataQuery, (err, results) => {
    if (err) {
      console.error('Error checking for initial data:', err.stack);
      return;
    }

    const gendersTableHasData = results[0].length > 0;
    const messagesTableHasData = results[1].length > 0;

    if (!gendersTableHasData || !messagesTableHasData) {
      console.log('Inserting initial data...');

      const insertDataPromises = insertInitialDataQueries.map(query => 
        new Promise((resolve, reject) => {
          db.query(query, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        })
      );

      Promise.all(insertDataPromises)
        .then(() => {
          console.log('Initial data inserted successfully.');
          // After inserting the data, check and create root admin
          checkAndCreateRootAdmin();
        })
        .catch(err => {
          console.error('Error inserting initial data:', err.stack);
        });
    } else {
      console.log('Initial data already exists, skipping insertion.');
      // After confirming the initial data, check and create root admin
      checkAndCreateRootAdmin();
    }
  });
}

async function checkAndCreateRootAdmin() {
  const checkUserQuery = `SELECT * FROM users WHERE user_type = 'root_admin' LIMIT 1;`;

  db.query(checkUserQuery, async (err, results) => {
    if (err) {
      console.error('Error checking for root_admin user:', err.stack);
      return;
    }

    if (results.length === 0) {
      console.log('No root_admin user found, creating default root_admin user.');

      try {
        const userId = process.env.ROOT_ADMIN_ID;
        const password = process.env.ROOT_ADMIN_PASSWORD;
        const hashedPassword = await bcrypt.hash(password, 10);
        const userType = 'root_admin';
        const fullName = process.env.ROOT_ADMIN_FULLNAME;
        const genderId = parseInt(process.env.ROOT_ADMIN_GENDER_ID, 10);
        const nationalId = process.env.ROOT_ADMIN_NATIONAL_ID;
        const phone = process.env.ROOT_ADMIN_PHONE;
        const email = process.env.ROOT_ADMIN_EMAIL;
        const isBlocked = false;
        const dp = null;

        const insertRootAdminQuery = `
          INSERT INTO users (
            user_id, password, user_type, fullname, gender_id, national_id, phone, email, is_blocked, dp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await new Promise((resolve, reject) => {
          db.query(insertRootAdminQuery, [
            userId, hashedPassword, userType, fullName, genderId, nationalId, phone, email, isBlocked, dp
          ], (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });

        console.log('Default root_admin user created successfully.');
      } catch (err) {
        console.error('Error creating root_admin user:', err.stack);
      }
    } else {
      console.log('Root admin user already exists, skipping creation.');
    }
  });
}

module.exports = db;
