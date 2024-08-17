const express = require('express');
const router = express.Router();
const cron = require('node-cron');
const { sendLoanReminders } = require('./sendReminders');

// Schedule a task to run daily at 8 AM
cron.schedule('0 8 * * *', () => {
  sendLoanReminders();
});

// Export the router
module.exports = router;
