require('dotenv').config(); // Load environment variables from .env file
const twilio = require('twilio'); // Include Twilio helper library

// Configure Twilio client using credentials from environment variables
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Send an SMS using Twilio
 * @param {string} to - The destination phone number
 * @param {string} body - The message to be sent
 * @returns {Promise<string>} - A promise that resolves with the message SID or rejects with an error
 */
const sendSMS = async (to, body) => {
    console.log('Attempt to send SMS');
    
    try {
        const message = await client.messages.create({
            body: body,
            from: process.env.TWILIO_NUMBER,
            to: to
        });
        console.log('Message sent with SID:', message.sid);
        return message.sid;
    } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
    }
}

module.exports = { sendSMS };
