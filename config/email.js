import emailjs from 'emailjs';
import dotenv from 'dotenv'; // If you want to keep dotenv for environment variables

dotenv.config();

/**
 * Sends an email using EmailJS.
 *
 * @param {object} templateParams - The template parameters.
 *
 * @returns {Promise<object>} - The EmailJS response if successful.
 */
async function sendEmail(templateParams) {
  const serviceId = process.env.EMAILJS_SERVICE_ID; // Service ID
  const templateId = process.env.EMAILJS_TEMPLATE_ID; // Template ID
  const userId = process.env.EMAILJS_USER_ID; // Public/User key 

  try {
    const response = await emailjs.send(serviceId, templateId, templateParams, userId);
    return response; // Success response from EmailJS
  } catch (error) {
    console.log('Failed to send email', error); // Handle errors
  }
}

export default sendEmail; // Use export instead of module.exports
