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
      required: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
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

// Before a user is deleted, this function will execute.
userSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  try {
    // 'this' refers to the user document being removed.
    const userId = this._id;

    // Delete all documents in other collections that reference this user.
    await Medicine.deleteMany({ user: userId });
    await Schedule.deleteMany({ user: userId });
    await DoseLog.deleteMany({ user: userId });
    await Caregiver.deleteMany({ user: userId });
    
    next(); // Proceed with deleting the user document itself.
  } catch (error) {
    next(error); // Pass any errors to the next middleware.
  }
});


// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;