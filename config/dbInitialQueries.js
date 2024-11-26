// SQL queries for creating tables
const createTablesQueries = [
    // Create the genders table
    `CREATE TABLE IF NOT EXISTS genders (
     gender_id INT AUTO_INCREMENT PRIMARY KEY,
    gender VARCHAR(50) NOT NULL
      );`,
  
    // Create the users table
    `CREATE TABLE IF NOT EXISTS users (
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
);`,
  
    // Create the notifications table
    `CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL,
    target_user VARCHAR(50) NOT NULL,
    content TEXT,
    date DATETIME NOT NULL
);`,
  
    // Create the messages table
    `CREATE TABLE IF NOT EXISTS messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    message_type VARCHAR(50) NOT NULL,
    target_user VARCHAR(50) NOT NULL,
    message TEXT
);`,
  
    // Create the loan_applications table
    `CREATE TABLE IF NOT EXISTS loan_applications (
   id INT AUTO_INCREMENT PRIMARY KEY,
   applicant_id VARCHAR(100) NOT NULL,
   loan_amount INT NOT NULL,
   collateral VARCHAR(200),
   num_weeks INT NOT NULL,
   location VARCHAR(100) NOT NULL,
   date_applied DATETIME DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY (applicant_id) REFERENCES users(user_id)
);`,
  
    // Create the loan_types table
    `CREATE TABLE IF NOT EXISTS loan_types (
    loan_type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(255) NOT NULL
);`,
  
    // Create the loans table
    `CREATE TABLE IF NOT EXISTS loans (
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
);`,
  
    // Create the payments table
    `CREATE TABLE IF NOT EXISTS payments (
    payment_id VARCHAR(100) PRIMARY KEY,
    handler_id VARCHAR(100) NOT NULL,
    loan_id VARCHAR(100) NOT NULL,
    amount_paid INT NOT NULL,
    date_paid DATETIME NOT NULL,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (handler_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE
);`,
  
    // Create the interest_rates table
    `CREATE TABLE IF NOT EXISTS interest_rates (
    rate_id INT AUTO_INCREMENT PRIMARY KEY,
    loan_type_id INT NOT NULL,
    num_weeks INT NOT NULL,
    normal_rate INT NOT NULL,
    overdue_rate INT NOT NULL,  -- Fixed typo here
    FOREIGN KEY(loan_type_id) REFERENCES loan_types(loan_type_id)
);`,
  
    // Create the terms_and_conditions table
    `CREATE TABLE IF NOT EXISTS terms_and_conditions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    version VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    effective_date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);`,
  
    // Create the user_tnc_acceptance table
    `CREATE TABLE IF NOT EXISTS user_tnc_acceptance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);`,
  
    // Create the payment_details table
    `CREATE TABLE IF NOT EXISTS payment_details (
    payment_detail_id INT AUTO_INCREMENT PRIMARY KEY,
    payment_mode_name VARCHAR(100),
    account_name VARCHAR(255),
    account_number VARCHAR(255)
);`,
  
    // Create the system table
    `CREATE TABLE IF NOT EXISTS system_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    system_name VARCHAR(200),
    slogan VARCHAR(250),
    logo_img_name VARCHAR(400)
);`,
`CREATE TABLE IF NOT EXISTS about (
    id INT PRIMARY KEY AUTO_INCREMENT,
    brand_mission VARCHAR(1000),
    brand_vision VARCHAR(1000),
    contact_phone VARCHAR(20),
    whatsapp_phone VARCHAR(20),
    contact_email VARCHAR(256),
    core_values VARCHAR(800)
);`,
`CREATE TABLE IF NOT EXISTS adverts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    advert_image_name VARCHAR(255),
    advert_content TEXT
);`,
`CREATE TABLE IF NOT EXISTS brand_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    brand_image_name VARCHAR(255)
);
`
  ];
  
  // SQL queries for inserting initial data
  const insertInitialDataQueries = [
    `INSERT INTO messages (message_type, target_user, message)
VALUES 
('LOAN_CREATION', 'admin', 'Message for loan creation for admin'),
('LOAN_CREATION', 'customer', 'Message for loan creation for customer'),
('LOAN_REMINDER_(NORMAL)', 'admin', 'Normal loan reminder for admin'),
('LOAN_REMINDER_(NORMAL)', 'customer', 'Normal loan reminder for customer'),
('LOAN_REMINDER_ON_DUE_DATE', 'admin', 'Due date loan reminder for admin'),
('LOAN_REMINDER_ON_DUE_DATE', 'customer', 'Due date loan reminder for customer'),
('LOAN_REMINDER_(OVERDUE)', 'admin', 'Overdue loan reminder for admin'),
('LOAN_REMINDER_(OVERDUE)', 'customer', 'Overdue loan reminder for customer');
`,
  
    `INSERT INTO genders (gender) VALUES ('Male'), ('Female'), ('Other');`
  ];
  
  module.exports = { createTablesQueries, insertInitialDataQueries };
  