const session = require('express-session');
const MySQLStoreFactory = require('express-mysql-session');
const dotenv = require('dotenv');

dotenv.config();

const createSessionMiddleware = (options = {}) => { // accept options
  const MySQLStore = MySQLStoreFactory(session);

  const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const isProduction = process.env.NODE_ENV === 'production';
  
  return session({
    name: 'session_id',
    secret: process.env.SESSION_SECRET || 'change_this_secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // must be 'none' for cross-subdomain
      domain: options.cookieDomain || undefined, // set from server.js
      maxAge: 1000 * 60 * 60 * 24,
      path: '/',
    }
  });
};

module.exports = { createSessionMiddleware };