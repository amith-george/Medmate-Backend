const User = require('../models/user.model.js');
const jwt = require('jsonwebtoken');

// A helper function to sign and create a token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET);
};


// Register a new user
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // 1. Check if the user already exists in the database
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 2. If user doesn't exist, create them.
    const user = await User.create({
      name,
      email,
      password,
    });

    // 3. If the user was created successfully, send back their data and a token
    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};


// Login the user
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find the user by their email
    const user = await User.findOne({ email });

    // 2. Check if user exists AND if the password matches
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};


// Get profile information
const getUser = async (req, res) => {
  // The 'protect' middleware already found the user and attached it to `req.user`
  const user = req.user;
  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};


// Update user profiles
const updateUser = async (req, res) => {
  // Get the user from the database using the ID from the token
  const user = await User.findById(req.user._id);

  if (user) {
    // Update the fields if they are present in the request body
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;

    // Only update the password if a new one is sent
    if (req.body.password) {
      user.password = req.body.password;
    }

    // The pre-save hook in the model will automatically hash the new password
    const updatedUser = await user.save();

    // Send back the updated user data with a new token
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      token: generateToken(updatedUser._id), // It's good practice to issue a new token
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};


// Delete user profiles
const deleteUser = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    await user.deleteOne();
    res.json({ message: 'User removed successfully' });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};



module.exports = {
  registerUser,
  loginUser,
  getUser,
  updateUser,
  deleteUser
};