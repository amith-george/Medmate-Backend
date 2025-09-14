const mongoose = require('mongoose');

const scheduleSchema = mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Medicine', // Links this schedule to a specific medicine.
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User', // Links to the user for easier querying.
  },
  times: [
    {
      type: String, // An array of times in "HH:MM" format, e.g., ["08:00", "20:00"].
      required: true,
    },
  ],
  frequency: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'custom'], // As per your overview "daily or as configured".
    default: 'daily',
  },
  isActive: {
    type: Boolean,
    default: true, // A flag to easily enable or disable reminders for this med.
  },
});

const Schedule = mongoose.model('Schedule', scheduleSchema);
module.exports = Schedule;