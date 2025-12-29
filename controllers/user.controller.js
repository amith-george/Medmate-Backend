const User = require('../models/user.model.js');
const jwt = require('jsonwebtoken');
const admin = require('../config/firebase-config.js'); // Your Firebase Admin SDK setup

// Helper function to generate your own JWT for session management
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// --- NEW: Step 1 of Registration ---
// Checks if a user with the given phone number already exists in your database.
const checkUserExists = async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required.' });
  }

  const userExists = await User.findOne({ phone });
  if (userExists) {
    return res.status(400).json({ message: 'A user with this phone number already exists.' });
  }

  res.status(200).json({ message: 'Phone number is available.' });
};

// --- NEW: Step 2 of Registration ---
// Finalizes registration after the frontend has verified the OTP with Firebase.
const registerWithFirebase = async (req, res) => {
  const { name, password, idToken } = req.body;

  if (!idToken || !name || !password) {
    return res.status(400).json({ message: 'Firebase ID token, name, and password are required.' });
  }

  try {
    // Verify the Firebase ID token sent from the client
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const phone = decodedToken.phone_number;

    // Create the new user in your MongoDB database. The password will be
    // automatically hashed by the pre-save hook in your user.model.js file.
    const user = await User.create({
      name,
      phone,
      password,
      isPhoneVerified: true, // Phone is verified by this Firebase flow
    });

    if (user) {
      // Respond with the new user's data and your own custom JWT token
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Firebase registration error:', error);
    res.status(401).json({ message: 'User registration failed. The token may be invalid or expired.' });
  }
};

// --- UNCHANGED: For returning users ---
// This function is for users who have already registered and are logging in
// with their phone number and the password they created.
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
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid phone number or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- UNCHANGED: Protected routes logic ---
const getUser = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

const updateUser = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.avatar = req.body.avatar || user.avatar;
    if (req.body.password) {
      user.password = req.body.password;
    }
    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      avatar: updatedUser.avatar,
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404).json({ message: 'User not found' });
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

module.exports = {
  checkUserExists,
  registerWithFirebase,
  loginUser,
  getUser,
  updateUser,
  deleteUser,
};