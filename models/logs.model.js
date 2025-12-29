const mongoose = require('mongoose');

const doseLogSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Medicine',
    },
    scheduledTime: {
      type: Date,
      required: true,
    },
    actionTime: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'taken', 'missed'],
      default: 'pending',
    },
    caregiverNotified: {
      type: Boolean,
      default: false, // Track if caregiver was alerted about this dose
    },
    notes: {
      type: String, // Optional user notes like "felt nauseous", "took late because...", etc.
    },
  },
  {
    timestamps: true,
  }
);

// Critical for the scheduler's follow-up logic to find 'pending' logs
// from 15 and 30 minutes ago without scanning the entire collection.
doseLogSchema.index({ status: 1, scheduledTime: 1 });

const DoseLog = mongoose.model('DoseLog', doseLogSchema);
module.exports = DoseLog;