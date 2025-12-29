const express = require('express');
const router = express.Router();
const {
  addCaregiver,
  getMyCaregivers,
  removeCaregiver,
} = require('../controllers/caregiver.controller.js');
const { protect } = require('../middleware/authMiddleware.js');

router.use(protect);

// Add a new caregiver
router.post('/add', addCaregiver);

// Get all of the user's caregivers
router.get('/list', getMyCaregivers);

// Remove a caregiver by their ID
router.delete('/:id', removeCaregiver);

module.exports = router;