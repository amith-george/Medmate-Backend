const mongoose = require('mongoose');

const caregiverSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User', // The user this caregiver is monitoring.
  },
  name: {
    type: String,
    required: true,
  },
  relationship: {
    type: String, // e.g., "Son", "Spouse", "Nurse".
  },
  email: {
    type: String, // Required for email alerts and weekly summaries.
  },
  phone: {
    type: String, // Required for SMS alerts.
  },
  // A flag to control whether this caregiver receives the instant alerts for missed doses.
  receivesRealtimeAlerts: {
    type: Boolean,
    default: true,
  },
  // A flag to control whether this caregiver receives the weekly summary report.
  receivesWeeklySummary: {
    type: Boolean,
    default: true,
  },
});

const Caregiver = mongoose.model('Caregiver', caregiverSchema);
module.exports = Caregiver;