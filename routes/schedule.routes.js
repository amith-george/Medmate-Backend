const express = require('express');
const router = express.Router();
const {
  createSchedule,
  getAllMySchedules,
  getScheduleForMedicine,
  getTodaysReminders,
  updateSchedule,
  deleteSchedule,
} = require('../controllers/schedule.controller.js');
const { protect } = require('../middleware/authMiddleware.js');

router.use(protect);

// Create a new medicine schedule
router.post('/add', createSchedule);

// Get all of the user's medicine schedules
router.get('/list', getAllMySchedules);

// Get schedule information for a medicine
router.get('/medicine/:medicineId', getScheduleForMedicine);

// Get all of today's upcoming reminders for the user
router.get('/today', getTodaysReminders);

// Update an existing schedule
router.put('/update/:id', updateSchedule);

// Delete a schedule
router.delete('/delete/:id', deleteSchedule);

module.exports = router;