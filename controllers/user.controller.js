const User = require('../models/user.model.js');
const OTP = require('../models/otp.model.js'); // Import the new OTP model
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Needed for hashing OTPs
const admin = require('../config/firebase-config.js');
const { sendEmail } = require('../services/notification.service'); // Import your email service

// --- Helper Functions ---

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const validatePasswordComplexity = (password) => {
  const regex = /^(?=.*[0-9])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
  return regex.test(password);
};

// --- Controllers ---

const checkUserExists = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Phone number is required.' });

  const userExists = await User.findOne({ phone });
  if (userExists) return res.status(400).json({ message: 'A user with this phone number already exists.' });

  res.status(200).json({ message: 'Phone number is available.' });
};

const registerWithFirebase = async (req, res) => {
  const { name, password, idToken } = req.body;

  if (!idToken || !name || !password) return res.status(400).json({ message: 'All fields are required.' });

  if (!validatePasswordComplexity(password)) {
    return res.status(400).json({ 
      message: 'Password must be at least 8 characters long and contain at least one number, one uppercase letter, and one special character.' 
    });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const phone = decodedToken.phone_number;

    const user = await User.create({
      name,
      phone,
      password,
      isPhoneVerified: true, 
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        preferences: user.preferences,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User with this phone or email already exists.' });
    }
    res.status(401).json({ message: 'User registration failed. Token invalid.' });
  }
};

const loginUser = async (req, res) => {
  const { phone, password } = req.body;
  try {
    const user = await User.findOne({ phone });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        preferences: user.preferences,
        isEmailVerified: user.isEmailVerified,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid phone number or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const getUser = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      preferences: user.preferences,
      isEmailVerified: user.isEmailVerified // Explicitly return this status
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.avatar = req.body.avatar || user.avatar;

      if (req.body.preferences) {
        const isTryingToEnable = Object.values(req.body.preferences).some(val => val === true);
        if (isTryingToEnable && !user.email && !req.body.email) {
           return res.status(400).json({ message: 'You must add an email address to enable alerts.' });
        }
        user.preferences = { ...user.preferences, ...req.body.preferences };
      }

      if (req.body.password) {
        if (!validatePasswordComplexity(req.body.password)) {
            return res.status(400).json({ 
                message: 'Password must be at least 8 characters long and contain at least one number, one uppercase letter, and one special character.' 
            });
        }
        user.password = req.body.password;
      }

      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        preferences: updatedUser.preferences,
        isEmailVerified: updatedUser.isEmailVerified,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ message: messages.join(', ') });
    }
    if (error.code === 11000) {
        return res.status(400).json({ message: 'This email is already in use.' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      await user.deleteOne();
      res.json({ message: 'User removed successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Please provide both current and new passwords.' });

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (!(await user.matchPassword(currentPassword))) return res.status(401).json({ message: 'Invalid current password.' });

    if (!validatePasswordComplexity(newPassword)) {
      return res.status(400).json({ 
        message: 'New password must be at least 8 characters long and contain at least one number, one uppercase letter, and one special character.' 
      });
    }

    user.password = newPassword;
    await user.save();
    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const resetPasswordWithFirebase = async (req, res) => {
  const { idToken, newPassword } = req.body;
  if (!idToken || !newPassword) return res.status(400).json({ message: 'Missing token or password.' });
  if (!validatePasswordComplexity(newPassword)) {
    return res.status(400).json({ 
      message: 'Password must be at least 8 characters long and contain at least one number, one uppercase letter, and one special character.' 
    });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const phone = decodedToken.phone_number; 
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: 'No account found with this phone number.' });

    user.password = newPassword;
    await user.save();
    res.status(200).json({ message: 'Password reset successfully.' });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired verification token.' });
  }
};

// --- NEW: Send Email OTP ---
const sendEmailOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    // 1. Check if email is already taken by ANOTHER user
    // We exclude the current user (req.user._id) because they might be re-verifying their own email
    const emailExists = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (emailExists) {
      return res.status(400).json({ message: 'This email is already linked to another account.' });
    }

    // 2. Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Hash OTP before storing (security best practice)
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // 4. Save to OTP collection
    await OTP.create({ email, otp: hashedOtp });

    // 5. Send Email
    const subject = 'MedMate Email Verification';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #4CAF50;">Verify your Email</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 5px; color: #333;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
      </div>
    `;

    await sendEmail(email, subject, html);
    res.status(200).json({ message: 'OTP sent successfully' });

  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

// --- NEW: Verify Email OTP ---
const verifyEmailOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

  try {
    // 1. Find the latest OTP record for this email
    // We sort by createdAt descending to get the newest one if multiple exist
    const record = await OTP.findOne({ email }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ message: 'OTP expired or invalid.' });
    }

    // 2. Compare OTPs
    const isMatch = await bcrypt.compare(otp, record.otp);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP code.' });
    }

    // 3. Update User Record
    // Set isEmailVerified to true AND update the email field
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.email = email;
    user.isEmailVerified = true;
    
    // NOTE: Preferences are NOT enabled here automatically. 
    // The user must go to Notification Settings to enable them manually.

    const updatedUser = await user.save();

    // 4. Delete the OTP record (cleanup)
    await OTP.deleteOne({ _id: record._id });

    res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        preferences: updatedUser.preferences,
        isEmailVerified: updatedUser.isEmailVerified,
        token: generateToken(updatedUser._id),
        message: 'Email verified successfully!'
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
};

module.exports = {
  checkUserExists,
  registerWithFirebase,
  loginUser,
  getUser,
  updateUser,
  deleteUser,
  changePassword,
  resetPasswordWithFirebase,
  sendEmailOtp,    
  verifyEmailOtp, 
};