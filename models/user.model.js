const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true, // Every user must have a name.
    },
    email: {
      type: String,
      required: true,
      unique: true, // Ensures no two users can register with the same email.
    },
    password: {
      type: String,
      required: true, // The hashed password for login.
    },
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields.
  }
);

// Middleware to hash the password before saving a new user
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Middleware to check if the passwords are correct
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;