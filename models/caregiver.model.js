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
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  isPhoneVerified: {
    type: Boolean,
    default: false,
  },
  // A flag to control whether this caregiver receives the weekly summary report.
  receivesWeeklySummary: {
    type: Boolean,
    default: true,
  },
  alertPreferences: {
    missedDose: { 
      type: Boolean, 
      default: true 
    }, // Alert when dose is missed (with time info)
    lowStock: { 
      type: Boolean, 
      default: true 
    }, // Alert when medicine stock is low
    expiryAlert: { 
      type: Boolean, 
      default: true 
    }, // Alert when medicine is about to expire
  }
});

// Add compound unique index to prevent duplicate caregivers for the same user
caregiverSchema.index({ user: 1, email: 1 }, { unique: true });

const Caregiver = mongoose.model('Caregiver', caregiverSchema);
module.exports = Caregiver;