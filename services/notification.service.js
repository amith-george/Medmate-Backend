const nodemailer = require('nodemailer');

// 1. Configure your email transporter
// usage: For Gmail, you need an "App Password" (not your login password).
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAIL_USER, // Add this to your .env file
    pass: process.env.EMAIL_PASS, // Add this to your .env file
  },
});

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const mailOptions = {
      from: `"MedMate Alert" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = { sendEmail };