  const mongoose = require('mongoose');

  const scheduleSchema = mongoose.Schema(
    {
      medicine: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Medicine',
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      frequency: {
        type: String,
        required: true,
        enum: ['daily', 'weekly', 'interval', 'custom', 'asNeeded'],
        default: 'daily',
      },
      times: [
        {
          type: String, // "HH:mm" format.
        },
      ],
      daysOfWeek: [
        {
          type: String,
          enum: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        },
      ],
      intervalHours: {
        type: Number,
      },
      lastTakenAt: {
        type: Date,
      },
      customIntervalDays: {
        type: Number,
      },
      startDate: {
        type: Date,
        default: Date.now,
      },
      endDate: {
        type: Date,
      },
      instructions: {
        type: String, // "Take with food", "Before bedtime", "On empty stomach", etc.
      },
    },
    {
      timestamps: true,
    }
  );

  // 1. Critical for the scheduler to find active, due reminders quickly.
  scheduleSchema.index({ isActive: 1, frequency: 1 });

  // 2. Critical for fetching all schedules for a specific user efficiently.
  scheduleSchema.index({ user: 1 });

  // Validation middleware
  scheduleSchema.pre('save', function (next) {
    // Validate daily schedules
    if (this.frequency === 'daily' && (!this.times || this.times.length === 0)) {
      return next(new Error('Daily schedules must have at least one time'));
    }
    
    // Validate weekly schedules
    if (this.frequency === 'weekly') {
      if (!this.times || this.times.length === 0) {
        return next(new Error('Weekly schedules must have at least one time'));
      }
      if (!this.daysOfWeek || this.daysOfWeek.length === 0) {
        return next(new Error('Weekly schedules must have at least one day of the week'));
      }
    }
    
    // Validate interval schedules
    if (this.frequency === 'interval' && !this.intervalHours) {
      return next(new Error('Interval schedules must have intervalHours'));
    }
    
    // Validate custom schedules
    if (this.frequency === 'custom') {
      if (!this.customIntervalDays) {
        return next(new Error('Custom schedules must have customIntervalDays'));
      }
      if (!this.times || this.times.length === 0) {
        return next(new Error('Custom schedules must have at least one time'));
      }
    }
    
    // Initialize lastTakenAt for interval/custom schedules
    if (this.isNew && ['interval', 'custom'].includes(this.frequency) && !this.lastTakenAt) {
      this.lastTakenAt = this.startDate || new Date();
    }
    
    next();
  });

  const Schedule = mongoose.model('Schedule', scheduleSchema);
  module.exports = Schedule;