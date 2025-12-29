const Medicine = require('../models/medicine.model.js');

// Create a new medicine
const createMedicine = async (req, res) => {
  const { name, dosage, stock, expiryDate, notes } = req.body;

  if (!name || !dosage || stock === undefined || !expiryDate) {
    return res.status(400).json({ message: 'Please provide all required fields: name, dosage, stock, and expiryDate.' });
  }

  try {
    const medicine = new Medicine({
      name,
      dosage,
      stock,
      expiryDate,
      notes,
      user: req.user._id, // Link the medicine to the logged-in user
    });

    const createdMedicine = await medicine.save();
    res.status(201).json(createdMedicine);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};


// Get all medicines for a logged in user
const getMyMedicines = async (req, res) => {
  try {
    // Find all medicines that have the logged-in user's ID
    const medicines = await Medicine.find({ user: req.user._id });
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};


// Get a specific medicine by its ID
const getMedicineById = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    // Check if the medicine was found and if it belongs to the logged-in user
    if (medicine && medicine.user.toString() === req.user._id.toString()) {
      res.json(medicine);
    } else {
      // If not found or user is not authorized, send a 404
      res.status(404).json({ message: 'Medicine not found or user not authorized' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};


// Update a medicine entry
const updateMedicine = async (req, res) => {
  const { name, dosage, stock, expiryDate, notes } = req.body;

  try {
    const medicine = await Medicine.findById(req.params.id);

    // Check if the medicine exists and belongs to the user
    if (medicine && medicine.user.toString() === req.user._id.toString()) {
      medicine.name = name || medicine.name;
      medicine.dosage = dosage || medicine.dosage;
      // Check for 'undefined' allows setting stock to 0
      medicine.stock = stock !== undefined ? stock : medicine.stock;
      medicine.expiryDate = expiryDate || medicine.expiryDate;
      medicine.notes = notes !== undefined ? notes : medicine.notes;

      const updatedMedicine = await medicine.save();
      res.json(updatedMedicine);
    } else {
      res.status(404).json({ message: 'Medicine not found or user not authorized' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};


// Delete a medicine entry
const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    // Check if the medicine exists and belongs to the user
    if (medicine && medicine.user.toString() === req.user._id.toString()) {
      await medicine.deleteOne();
      res.json({ message: 'Medicine removed successfully' });
    } else {
      res.status(404).json({ message: 'Medicine not found or user not authorized' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

module.exports = {
  createMedicine,
  getMyMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine,
};