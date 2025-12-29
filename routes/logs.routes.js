const express = require('express');
const router = express.Router();
const {
  recordDoseAction,
  getLogsForMedicine,
  getRecentLogs,
  deleteLog,
} = require('../controllers/logs.controller.js');
const { protect } = require('../middleware/authMiddleware.js');

router.use(protect);

// Record a dose action (taken or missed)
router.post('/record', recordDoseAction);

// Get a summary of recent logs for the logged-in user
router.get('/recent', getRecentLogs);

// Get all logs for a specific medicine
router.get('/:medicineId', getLogsForMedicine);

// Delete a specific log entry
router.delete('/delete/:id', deleteLog);

module.exports = router;