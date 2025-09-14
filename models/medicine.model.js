const mongoose = require('mongoose');

const medicineSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User', // Creates a direct link to the User model.
    },
    name: {
      type: String,
      required: true, // The name of the medicine, e.g., "Paracetamol".
    },
    dosage: {
      type: String,
      required: true, // Dosage details, e.g., "500mg" or "1 tablet".
    },
    stock: {
      type: Number,
      required: true,
      default: 0, // Current number of pills/units available.
    },
    expiryDate: {
      type: Date,
      required: true, // The expiry date to trigger alerts.
    },
    notes: {
      type: String, // Optional field for user notes like "Take with food".
    },
  },
  {
    timestamps: true,
  }
);

const Medicine = mongoose.model('Medicine', medicineSchema);
module.exports = Medicine;