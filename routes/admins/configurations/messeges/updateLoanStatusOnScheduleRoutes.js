const express = require('express');
const router = express.Router();
const cron = require('node-cron');
const { dbInitialized } = require('../../../../config/db');
const { sendLoanReminders } = require('./sendReminders');

// Middleware to ensure database is initialized before processing requests
dbInitialized.then(() => {
  cron.schedule('0 8 * * *', () => {
    sendLoanReminders();
  });
});

// Export the router
module.exports = router;
