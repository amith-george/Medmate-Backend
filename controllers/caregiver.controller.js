const Caregiver = require('../models/caregiver.model.js');
const User = require('../models/user.model.js');


// Add a new caregiver
const addCaregiver = async (req, res) => {
  // Destructure all fields from the model, including the new preferences
  const { name, email, phone, relationship, receivesWeeklySummary, alertPreferences } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ message: 'Caregiver name, email, and phone are required.' });
  }

  try {
    const existingCaregiver = await Caregiver.findOne({ user: req.user._id, email });
    if (existingCaregiver) {
      return res.status(400).json({ message: 'This caregiver has already been added.' });
    }

    const caregiver = await Caregiver.create({
      user: req.user._id,
      name,
      email,
      phone,
      relationship,
      receivesWeeklySummary, // Add new field to creation
      alertPreferences,      // Add new field to creation
    });

    res.status(201).json(caregiver);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};



// Get all caregivers for a logged in user
const getMyCaregivers = async (req, res) => {
  try {
    const caregivers = await Caregiver.find({ user: req.user._id });
    res.json(caregivers);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};


// Update a caregiver's information 
const updateCaregiver = async (req, res) => {
  try {
    const caregiver = await Caregiver.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!caregiver) {
      return res.status(404).json({ message: 'Caregiver not found or user not authorized.' });
    }

    // Update basic details if provided
    caregiver.name = req.body.name || caregiver.name;
    caregiver.phone = req.body.phone || caregiver.phone;
    caregiver.relationship = req.body.relationship || caregiver.relationship;

    // Update weekly summary preference if provided
    if (req.body.receivesWeeklySummary !== undefined) {
      caregiver.receivesWeeklySummary = req.body.receivesWeeklySummary;
    }

    // Update specific alert preferences if provided
    if (req.body.alertPreferences) {
      caregiver.alertPreferences = {
        ...caregiver.alertPreferences,
        ...req.body.alertPreferences,
      };
    }

    const updatedCaregiver = await caregiver.save();
    res.json(updatedCaregiver);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};



// Remove a caregiver
const removeCaregiver = async (req, res) => {
  try {
    const caregiver = await Caregiver.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (caregiver) {
      await caregiver.deleteOne();
      res.json({ message: 'Caregiver removed successfully.' });
    } else {
      res.status(404).json({ message: 'Caregiver not found or user not authorized.' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

module.exports = {
  addCaregiver,
  getMyCaregivers,
  updateCaregiver, 
  removeCaregiver,
};