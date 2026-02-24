// const session = require('express-session');
// const MySQLStoreFactory = require('express-mysql-session');
// const dotenv = require('dotenv');
// dotenv.config();

// const MySQLStore = MySQLStoreFactory(session);

// const sessionStore = new MySQLStore({
//   host: process.env.DB_HOST || 'localhost',
//   port: process.env.DB_PORT || 3306,
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASS || '',
//   database: process.env.DB_NAME || 'xander_creditors',
// });

// const createSessionMiddleware = () => {
//   return session({
//     key: 'session_id',
//     secret: process.env.SESSION_SECRET || 'change_this_secret',
//     store: sessionStore,
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       httpOnly: true,
//       secure: false,
//       maxAge: 1000 * 60 * 60 * 24,
//     }
//   });
// };

// module.exports = { createSessionMiddleware };