const express = require('express');
const router = express.Router();
const {
  checkUserExists,
  registerWithFirebase,
  loginUser,
  getUser,
  updateUser,
  deleteUser,
} = require('../controllers/user.controller.js');
const { protect } = require('../middleware/authMiddleware.js');


// Step 1 of registration: Frontend checks if phone number is available.
router.post('/check-user', checkUserExists);

// Step 2 of registration: Frontend finalizes registration after OTP verification.
router.post('/register', registerWithFirebase);

// For returning users to log in with their phone and password.
router.post('/login', loginUser);


// Get the logged-in user's profile.
router.get('/profile', protect, getUser);

// Update the logged-in user's profile.
router.put('/profile', protect, updateUser);

// Delete the logged-in user's profile.
router.delete('/profile', protect, deleteUser);


module.exports = router;