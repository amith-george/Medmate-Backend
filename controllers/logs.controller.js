const DoseLog = require('../models/logs.model.js');
const Medicine = require('../models/medicine.model.js');
const mongoose = require('mongoose');


// Record a dose action
const recordDoseAction = async (req, res) => {
  // Added 'notes' to be captured from the request
  const { medicineId, scheduledTime, status, notes } = req.body;

  if (!medicineId || !scheduledTime || !status) {
    return res.status(400).json({ message: 'Medicine ID, scheduled time, and status are required.' });
  }

  if (!['taken', 'missed'].includes(status)) {
    return res.status(400).json({ message: 'Status must be either "taken" or "missed".' });
  }

  try {
    const medicine = await Medicine.findOne({ _id: medicineId, user: req.user._id });
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found or you are not authorized.' });
    }

    const log = await DoseLog.create({
      user: req.user._id,
      medicine: medicineId,
      scheduledTime,
      status,
      notes, 
      actionTime: new Date(),
    });

    // If the dose was taken, decrement the medicine stock
    if (status === 'taken' && medicine.stock > 0) {
      medicine.stock -= 1;
      await medicine.save();
    }

    res.status(201).json({
      message: 'Log created successfully.',
      log,
      updatedStock: medicine.stock,
    });
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};


// Get all logs for a specific medicine
const getLogsForMedicine = async (req, res) => {
  try {
    const { medicineId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(medicineId)) {
      return res.status(400).json({ message: 'Invalid Medicine ID.' });
    }

    const logs = await DoseLog.find({
      user: req.user._id,
      medicine: medicineId,
    }).sort({ scheduledTime: -1 });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};


// Get recent 30 logs for a user
const getRecentLogs = async (req, res) => {
  try {
    const logs = await DoseLog.find({ user: req.user._id })
      .sort({ scheduledTime: -1 })
      .limit(30)
      .populate('medicine', 'name');

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};


// Update the notes on a specific log entry
const updateLogNotes = async (req, res) => {
  const { notes } = req.body;

  try {
    const log = await DoseLog.findById(req.params.id);

    if (log && log.user.toString() === req.user._id.toString()) {
      log.notes = notes || ''; // Update notes, allow setting to empty
      const updatedLog = await log.save();
      res.json(updatedLog);
    } else {
      res.status(404).json({ message: 'Log not found or user not authorized.' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};


// Delete a log entry
const deleteLog = async (req, res) => {
  try {
    const log = await DoseLog.findById(req.params.id);

    if (log && log.user.toString() === req.user._id.toString()) {
      // If the deleted log was 'taken', restore the stock count
      if (log.status === 'taken') {
        await Medicine.updateOne({ _id: log.medicine }, { $inc: { stock: 1 } });
      }
      await log.deleteOne();
      res.json({ message: 'Log removed successfully.' });
    } else {
      res.status(404).json({ message: 'Log not found or user not authorized.' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};


module.exports = {
  recordDoseAction,
  getLogsForMedicine,
  getRecentLogs,
  updateLogNotes,
  deleteLog,
};