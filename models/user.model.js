const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import child models to perform cascade delete
const Medicine = require('./medicine.model.js');
const Schedule = require('./schedule.model.js');
const DoseLog = require('./logs.model.js');
const Caregiver = require('./caregiver.model.js');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      maxLength: [15, 'Name cannot exceed 15 characters'],
      match: [/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'],
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 
        'Please provide a valid email address'
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      match: [/^(\+91)?\d{10}$/, 'Phone number must be a valid 10-digit number (can include +91)'], 
    },
    avatar: {
      type: String,
      default: 'boy1.png',
    },
    timeZone: {
      type: String,
      required: true,
      default: 'Asia/Kolkata',
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    preferences: {
      weeklyReport: {
        type: Boolean,
        default: false,
      },
      lowStockExpiryAlerts: {
        type: Boolean,
        default: false,
      },
      monthlyReport: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Middleware to hash the password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Cascade delete middleware
userSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  try {
    const userId = this._id;
    await Medicine.deleteMany({ user: userId });
    await Schedule.deleteMany({ user: userId });
    await DoseLog.deleteMany({ user: userId });
    await Caregiver.deleteMany({ user: userId });
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;