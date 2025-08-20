const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();
const { createTablesQueries, insertInitialDataQueries } = require('./dbInitialQueries');

// Create a MySQL connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
  waitForConnections: true,
  connectionLimit: 4,
  queueLimit: 0
});

// Create a promise that resolves when DB is fully initialized
const dbInitialized = new Promise((resolve, reject) => {
  // Test the connection pool
  db.getConnection((err, connection) => {
    if (err) {
      console.error('MySQL connection failed:', err.stack);
      reject(err);
      return;
    }
    console.log('Connected to MySQL server.');
    connection.release();

    // Initialize the database (create tables)
    initializeDatabase()
      .then(resolve)
      .catch(reject);
  });
});

async function initializeDatabase() {
  try {
    console.log('Starting database table resolution...');
    // Create tables sequentially to handle foreign key dependencies
    for (const query of createTablesQueries) {
      await new Promise((resolve, reject) => {
        db.query(query, (err) => {
          if (err) {
            console.error(`Error executing query: ${query.substring(0, 100)}...`);
            reject(err);
          } else {
            // Optional: Log successful creation of each table
            const tableNameMatch = query.match(/CREATE TABLE IF NOT EXISTS `?(\w+)`?/i);
            if (tableNameMatch && tableNameMatch[1]) {
                console.log(`Table '${tableNameMatch[1]}' resolved successfully.`);
            } else {
                console.log(`Query executed successfully: ${query.substring(0, 50)}...`);
            }
            resolve();
          }
        });
      });
    }

    console.log('Database tables created successfully.');
    
    // After creating tables, check and insert initial data if necessary
    await insertInitialDataIfNeeded();
    
    console.log('Database initialization complete');
  } catch (err) {
    console.error('Error initializing database:', err.stack);
    // You might want to also explicitly reject the promise that initializeDatabase resolves
    throw err;
  }
}

async function insertInitialDataIfNeeded() {
  return new Promise((resolve, reject) => {
    const checkDataQuery = `
      SELECT 1 FROM genders LIMIT 1;
      SELECT 1 FROM messages LIMIT 1;
    `;

    db.query(checkDataQuery, async (err, results) => {
      if (err) {
        reject(err);
        return;
      }

      const gendersTableHasData = results[0].length > 0;
      const messagesTableHasData = results[1].length > 0;

      if (!gendersTableHasData || !messagesTableHasData) {
        console.log('Inserting initial data...');

        try {
          const insertDataPromises = insertInitialDataQueries.map(query => 
            new Promise((resolve, reject) => {
              db.query(query, (err) => {
                if (err) reject(err);
                else resolve();
              });
            })
          );

          await Promise.all(insertDataPromises);
          console.log('Initial data inserted successfully.');
          await checkAndCreateRootAdmin();
          resolve();
        } catch (err) {
          reject(err);
        }
      } else {
        console.log('Initial data already exists, skipping insertion.');
        await checkAndCreateRootAdmin();
        resolve();
      }
    });
  });
}

async function checkAndCreateRootAdmin() {
  return new Promise((resolve, reject) => {
    const checkUserQuery = `SELECT * FROM users WHERE user_type = 'root_admin' LIMIT 1;`;

    db.query(checkUserQuery, async (err, results) => {
      if (err) {
        reject(err);
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
              if (err) reject(err);
              else resolve();
            });
          });

          console.log('Default root_admin user created successfully.');
          resolve();
        } catch (err) {
          reject(err);
        }
      } else {
        console.log('Root admin user already exists, skipping creation.');
        resolve();
      }
    });
  });
}

db.promise = () => {
  return {
    query: (sql, values) => {
      return new Promise((resolve, reject) => {
        db.query(sql, values, (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
    }
  };
};



module.exports = db;                  // Default export (backward compatible)
module.exports.db = db;              // Named export
module.exports.dbInitialized = dbInitialized; // Named export