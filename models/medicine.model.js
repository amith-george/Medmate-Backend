const mongoose = require('mongoose');

// Import child models to perform cascade delete
const Schedule = require('./schedule.model.js');
const DoseLog = require('./logs.model.js');

const medicineSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User', 
    },
    name: {
      type: String,
      required: true,
    },
    dosage: {
      type: String,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Before a medicine is deleted, this function will execute.
medicineSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  try {
    // 'this' refers to the medicine document being removed.
    const medicineId = this._id;

    // Delete all documents in other collections that reference this medicine.
    await Schedule.deleteMany({ medicine: medicineId });
    await DoseLog.deleteMany({ medicine: medicineId });

    next(); // Proceed with deleting the medicine document.
  } catch (error) {
    next(error); // Pass any errors to the next middleware.
  }
});


const Medicine = mongoose.model('Medicine', medicineSchema);
module.exports = Medicine;