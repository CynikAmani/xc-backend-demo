const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();
const { createTablesQueries, insertInitialDataQueries } = require('./dbInitialQueries');
const { createIndexesIfNeeded } = require('./tableIndexes'); 

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

// Promise that resolves when DB is fully initialized
const dbInitialized = new Promise((resolve, reject) => {
  db.getConnection(async (err, connection) => {
    if (err) {
      console.error('MySQL connection failed:', err.stack);
      return reject(err);
    }
    console.log('Connected to MySQL server.');
    connection.release();

    try {
      await initializeDatabase();
      resolve();
    } catch (err) {
      reject(err);
    }
  });
});

async function initializeDatabase() {
  try {
    // Execute all table creation queries without per-table logs
    await Promise.all(createTablesQueries.map(query => 
      new Promise((res, rej) => db.query(query, err => err ? rej(err) : res()))
    ));

    console.log('🔹 Tables checked/created successfully.');

    // Insert initial data if needed
    await insertInitialDataIfNeeded();

    // Create indexes
    await createIndexesIfNeeded(db);
    console.log('Database initialization complete.');
  } catch (err) {
    console.error('Error initializing database:', err.stack);
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
      if (err) return reject(err);

      const [gendersResult, messagesResult] = results;
      const needsInsertion = !gendersResult.length || !messagesResult.length;

      if (needsInsertion) console.log('📥 Inserting initial data...');
      try {
        if (needsInsertion) {
          await Promise.all(
            insertInitialDataQueries.map(
              query => new Promise((res, rej) => db.query(query, err => (err ? rej(err) : res())))
            )
          );
          console.log('Initial data inserted successfully.');
        } else {
          console.log('Initial data already exists, skipping insertion.');
        }

        await checkAndCreateRootAdmin();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function checkAndCreateRootAdmin() {
  return new Promise((resolve, reject) => {
    const checkQuery = `SELECT * FROM users WHERE user_type = 'root_admin' LIMIT 1;`;

    db.query(checkQuery, async (err, results) => {
      if (err) return reject(err);

      if (!results.length) {
        console.log('👑 Creating default root_admin user...');
        try {
          const hashedPassword = await bcrypt.hash(process.env.ROOT_ADMIN_PASSWORD, 10);
          const insertQuery = `
            INSERT INTO users (
              user_id, password, user_type, fullname, gender_id, national_id, phone, email, is_blocked, dp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          await new Promise((res, rej) => {
            db.query(
              insertQuery,
              [
                process.env.ROOT_ADMIN_ID,
                hashedPassword,
                'root_admin',
                process.env.ROOT_ADMIN_FULLNAME,
                parseInt(process.env.ROOT_ADMIN_GENDER_ID, 10),
                process.env.ROOT_ADMIN_NATIONAL_ID,
                process.env.ROOT_ADMIN_PHONE,
                process.env.ROOT_ADMIN_EMAIL,
                false,
                null
              ],
              err => (err ? rej(err) : res())
            );
          });
          console.log('Default root_admin created successfully.');
        } catch (err) {
          return reject(err);
        }
      } else {
        console.log('ℹRoot admin user already exists, creation skipped.');
      }

      resolve();
    });
  });
}

// Promise wrapper for async/await
db.promise = () => ({
  query: (sql, values) => new Promise((resolve, reject) => {
    db.query(sql, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  })
});

module.exports = db;
module.exports.db = db;
module.exports.dbInitialized = dbInitialized;