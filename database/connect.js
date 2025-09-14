const mongoose = require('mongoose');

async function connectDB() {
  try {
    await mongoose.connect(process.env.DB_CONNECT);
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('DB connection error:', err);
    process.exit(1);
  }
}

module.exports = connectDB;
