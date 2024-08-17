const express = require('express');
const router = express.Router();
const db = require('../../../../config/db'); 
const { sendSMS } = require('../../../../config/twilioService');


// Route to send an SMS
router.post('/', async (req, res) => {
    const { username, message } = req.body;

    try {
        // Step 1: Insert notification into the notifications table
        const now = new Date();
        await db.promise().query(
            'INSERT INTO notifications (notification_type, target_user, content, date) VALUES (?, ?, ?, ?)',
            ['reminder', username, message, now]
        );

        // Step 2: Retrieve the phone number associated with the username
        const [users] = await db.promise().query(
            'SELECT phone FROM users WHERE user_id = ?',
            [username]
        );

        const phone = users[0].phone;

        // Step 3: Send the SMS using Twilio
        await sendSMS(`+${phone}`, message);

        // Step 4: Send a success response
        res.status(200).json({ success: true, message: 'Reminder sent successfully.' });
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({ error: 'A technical problem occurred while sending the reminder. Please try again later.' });
    }
});

module.exports = router;
