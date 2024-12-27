const express = require('express');
const db = require('../../../../config/db');
const checkAdmin = require('../../../../auth/checkAdmin');
const cron = require('node-cron');
const router = express.Router();

router.post('/', checkAdmin, (req, res) => {
    const { discount, endDate } = req.body;

    // Input validation
    if (!discount || !endDate) {
        return res.status(400).json({ message: 'Missing required fields: discount and endDate' });
    }

    // Step 1: Reset rates to match standard rates
    db.query('UPDATE interest_rates SET normal_rate = standard_rate', (err) => {
        if (err) {
            console.error('Error resetting rates:', err);
            return res.status(500).json({ message: 'Error resetting rates' });
        }

        // Step 2: Apply new discount to normal rates
        db.query('UPDATE interest_rates SET normal_rate = normal_rate - ?', [discount], (err) => {
            if (err) {
                console.error('Error updating interest rates:', err);
                return res.status(500).json({ message: 'Error updating interest rates' });
            }

            // Convert endDate to cron schedule format
            const endDateTime = new Date(endDate);
            const cronSchedule = `${endDateTime.getMinutes()} ${endDateTime.getHours()} ${endDateTime.getDate()} ${endDateTime.getMonth() + 1} *`;

            // Schedule reset operation using cron
            const job = cron.schedule(cronSchedule, () => {
                // Reset rates back to standard at end date
                db.query('UPDATE interest_rates SET normal_rate = standard_rate', (err) => {
                    if (err) {
                        console.error('Error resetting interest rates:', err);
                    }
                    // Stop the cron job after it executes
                    job.stop();
                });
            });

            res.status(200).json({ 
                message: 'Discount rate has been set successfully',
                resetScheduledFor: endDateTime
            });
        });
    });
});

module.exports = router;