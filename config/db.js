const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Create a MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306, // Default port if not provided
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true, 
});

db.connect(err => {
  if (err) {
    console.error('MySQL connection failed:', err.stack);
    return;
  }
  console.log('Connected to MySQL server.');

  // Check if the database exists and initialize if not
  const checkDbQuery = `SHOW DATABASES LIKE '${process.env.DB_NAME}';`;
  db.query(checkDbQuery, (err, results) => {
    if (err) {
      console.error('Error checking for database:', err.stack);
      return;
    }

    if (results.length === 0) {
      console.log(`Database "${process.env.DB_NAME}" not found, creating database...`);

      // Create the database
      const createDbQuery = `CREATE DATABASE ${process.env.DB_NAME};`;
      db.query(createDbQuery, (err) => {
        if (err) {
          console.error('Error creating database:', err.stack);
          return;
        }
        console.log(`Database "${process.env.DB_NAME}" created.`);

        // Use the newly created database
        const useDbQuery = `USE ${process.env.DB_NAME};`;
        db.query(useDbQuery, (err) => {
          if (err) {
            console.error('Error selecting database:', err.stack);
            return;
          }

          // Initialize tables
          initializeDatabase();
        });
      });
    } else {
      // Use the existing database
      const useDbQuery = `USE ${process.env.DB_NAME};`;
      db.query(useDbQuery, (err) => {
        if (err) {
          console.error('Error selecting database:', err.stack);
          return;
        }

        // Check if the database has at least one table
        const checkTablesQuery = `SHOW TABLES;`;
        db.query(checkTablesQuery, (err, tables) => {
          if (err) {
            console.error('Error checking for tables:', err.stack);
            return;
          }

          if (tables.length === 0) {
            console.log('No tables found in the database, initializing database...');
            
            // Initialize tables
            initializeDatabase();
          } else {
            console.log('Database has tables, skipping table and initial data creation.');

            // Check and create root admin
            checkAndCreateRootAdmin();
          }
        });
      });
    }
  });
});

function initializeDatabase() {
  // Define table creation queries
  const createTablesQueries = `
    -- Create the genders table
    CREATE TABLE IF NOT EXISTS genders (
      gender_id INT AUTO_INCREMENT PRIMARY KEY,
      gender VARCHAR(50) NOT NULL
    );

    -- Create the users table
    CREATE TABLE IF NOT EXISTS users (
      user_id VARCHAR(100) PRIMARY KEY,
      password VARCHAR(500) NOT NULL,
      user_type VARCHAR(20) NOT NULL,
      fullname VARCHAR(100) NOT NULL,
      gender_id INT,
      national_id VARCHAR(255) NOT NULL,
      phone VARCHAR(14),
      email VARCHAR(100),
      is_blocked BOOLEAN DEFAULT false,
      dp VARCHAR(100) DEFAULT NULL,
      FOREIGN KEY (gender_id) REFERENCES genders(gender_id)
    );

    -- Create the notifications table
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id INT AUTO_INCREMENT PRIMARY KEY,
      notification_type VARCHAR(50) NOT NULL,
      target_user VARCHAR(50) NOT NULL,
      content TEXT,
      date DATETIME NOT NULL
    );

    -- Create the messages table
    CREATE TABLE IF NOT EXISTS messages (
      message_id INT AUTO_INCREMENT PRIMARY KEY,
      message_type VARCHAR(50) NOT NULL,
      target_user VARCHAR(50) NOT NULL,
      message TEXT
    );

    -- Loan Applications table
    CREATE TABLE IF NOT EXISTS loan_applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      applicant_id VARCHAR(100) NOT NULL,
      loan_amount INT NOT NULL,
      collateral VARCHAR(200),
      num_weeks INT NOT NULL,
      location VARCHAR(100) NOT NULL,
      date_applied DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (applicant_id) REFERENCES users(user_id)
    );

    -- Create the loan_types table
    CREATE TABLE IF NOT EXISTS loan_types (
      loan_type_id INT AUTO_INCREMENT PRIMARY KEY,
      type_name VARCHAR(255) NOT NULL
    );

    -- Create the loans table
    CREATE TABLE IF NOT EXISTS loans (
      loan_id VARCHAR(100) PRIMARY KEY,
      customer_id VARCHAR(100) NOT NULL,
      handler_id VARCHAR(100) NOT NULL,
      loan_type_id INT NOT NULL,
      loan_amount INT NOT NULL,
      return_amount INT NOT NULL,
      interest_rate INT NOT NULL,
      num_weeks INT NOT NULL,
      start_date DATETIME NOT NULL,
      end_date DATETIME NOT NULL,
      status VARCHAR(50) NOT NULL,
      collateral VARCHAR(200) NOT NULL,
      is_cleared BOOLEAN DEFAULT false,
      FOREIGN KEY (customer_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
      FOREIGN KEY (handler_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
      FOREIGN KEY (loan_type_id) REFERENCES loan_types(loan_type_id) ON UPDATE CASCADE ON DELETE CASCADE
    );

    -- Create the payments table
    CREATE TABLE IF NOT EXISTS payments (
      payment_id VARCHAR(100) PRIMARY KEY,
      handler_id VARCHAR(100) NOT NULL,
      loan_id VARCHAR(100) NOT NULL,
      amount_paid INT NOT NULL,
      date_paid DATETIME NOT NULL,
      FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON UPDATE CASCADE ON DELETE CASCADE,
      FOREIGN KEY (handler_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE
    );

    -- Create the interest_rates table
    CREATE TABLE IF NOT EXISTS interest_rates (
      rate_id INT AUTO_INCREMENT PRIMARY KEY,
      loan_type_id INT NOT NULL,
      num_weeks INT NOT NULL,
      normal_rate INT NOT NULL,
      overdue_rate INT NOT NULL,
      FOREIGN KEY(loan_type_id) REFERENCES loan_types(loan_type_id)
    );

    -- Create the terms_and_conditions table
    CREATE TABLE IF NOT EXISTS terms_and_conditions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      version VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      effective_date DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    -- Create the user_tnc_acceptance table
    CREATE TABLE IF NOT EXISTS user_tnc_acceptance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );

    -- Create the payment_details table
    CREATE TABLE IF NOT EXISTS payment_details (
      payment_detail_id INT AUTO_INCREMENT PRIMARY KEY,
      payment_mode_name VARCHAR(100),
      account_name VARCHAR(255),
      account_number VARCHAR(255)
    );

    -- Create the system table
    CREATE TABLE IF NOT EXISTS system (
      id INT AUTO_INCREMENT PRIMARY KEY,
      system_name VARCHAR(200),
      slogan VARCHAR(250),
      logo_img_name VARCHAR(400)
    );
  `;

  db.query(createTablesQueries, (err) => {
    if (err) {
      console.error('Error creating tables:', err.stack);
      return;
    }
    console.log('Database tables created successfully.');

    // Insert initial data
    insertInitialData();
  });
}

function insertInitialData() {
  // Define initial data insertion queries
  const insertDataQueries = `
    INSERT INTO messages (message_type, target_user, message)
    VALUES 
      ('LOAN_CREATION', 'admin', 'Message for loan creation for admin'),
      ('LOAN_CREATION', 'customer', 'Message for loan creation for customer'),
      ('LOAN_REMINDER_(NORMAL)', 'admin', 'Normal loan reminder for admin'),
      ('LOAN_REMINDER_(NORMAL)', 'customer', 'Normal loan reminder for customer'),
      ('LOAN_REMINDER_ON_DUE_DATE', 'admin', 'Due date loan reminder for admin'),
      ('LOAN_REMINDER_ON_DUE_DATE', 'customer', 'Due date loan reminder for customer'),
      ('LOAN_REMINDER_(OVERDUE)', 'admin', 'Overdue loan reminder for admin'),
      ('LOAN_REMINDER_(OVERDUE)', 'customer', 'Overdue loan reminder for customer');

    INSERT INTO genders (gender) VALUES ('Male'), ('Female'), ('Other');
  `;

  db.query(insertDataQueries, (err) => {
    if (err) {
      console.error('Error inserting initial data:', err.stack);
      return;
    }
    console.log('Initial data inserted successfully.');

    // After initializing the database, check and create root admin
    checkAndCreateRootAdmin();
  });
}

async function checkAndCreateRootAdmin() {
  const rootUsername = process.env.ROOT_ADMIN_USERNAME;
  const rootPassword = process.env.ROOT_ADMIN_PASSWORD;
  const rootFullname = process.env.ROOT_ADMIN_FULLNAME;

  const checkRootAdminQuery = `SELECT user_id FROM users WHERE user_type='root' LIMIT 1;`;
  db.query(checkRootAdminQuery, async (err, results) => {
    if (err) {
      console.error('Error checking for root admin:', err.stack);
      return;
    }

    if (results.length === 0) {
      console.log('Root admin not found, creating root admin...');

      const hashedPassword = await bcrypt.hash(rootPassword, 10);

      const createRootAdminQuery = `
        INSERT INTO users (user_id, password, user_type, fullname)
        VALUES (UUID(), '${hashedPassword}', 'root', '${rootFullname}');
      `;
      db.query(createRootAdminQuery, (err) => {
        if (err) {
          console.error('Error creating root admin:', err.stack);
          return;
        }
        console.log('Root admin created successfully.');
      });
    } else {
      console.log('Root admin already exists, skipping creation.');
    }
  });
}

module.exports = db;
