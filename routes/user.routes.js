const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUser,
  updateUser,
  deleteUser
} = require('../controllers/user.controller.js');
const { protect } = require('../middleware/authMiddleware.js');


router.post('/register', registerUser);

router.post('/login', loginUser);

router.get('/profile', protect, getUser);

router.put('/update', protect, updateUser);

router.delete('/delete', protect, deleteUser);


module.exports = router;