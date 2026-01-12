const mongoose = require('mongoose');

const otpSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // 600 seconds = 10 minutes. MongoDB auto-deletes this doc after this time.
  },
});

const OTP = mongoose.model('OTP', otpSchema);
module.exports = OTP;