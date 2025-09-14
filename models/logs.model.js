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
      required: true, // The exact date and time the dose was scheduled for.
    },
    actionTime: {
      type: Date, // The exact time the user confirmed taking the dose. Null if missed.
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'taken', 'missed'], // The state of this specific dose.
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

const DoseLog = mongoose.model('DoseLog', doseLogSchema);
module.exports = DoseLog;