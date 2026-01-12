const DoseLog = require('../models/logs.model.js');
const Medicine = require('../models/medicine.model.js');
const Caregiver = require('../models/caregiver.model.js');
const { sendEmail } = require('../services/notification.service.js');
const mongoose = require('mongoose');


// Record a dose action (Update existing pending log OR create new one)
const recordDoseAction = async (req, res) => {
  const { medicineId, scheduledTime, status, notes } = req.body;

  // 1. Basic Validation
  if (!medicineId || !scheduledTime || !status) {
    return res.status(400).json({ message: 'Medicine ID, scheduled time, and status are required.' });
  }

  if (!['taken', 'missed'].includes(status)) {
    return res.status(400).json({ message: 'Status must be either "taken" or "missed".' });
  }

  try {
    // 2. Verify Medicine exists and belongs to user
    const medicine = await Medicine.findOne({ _id: medicineId, user: req.user._id });
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found or you are not authorized.' });
    }

    // 3. Try to find an existing 'pending' log first (Prevent Duplicates)
    // We look for a log for this user+med+time that is currently 'pending'
    let log = await DoseLog.findOne({
      user: req.user._id,
      medicine: medicineId,
      scheduledTime: new Date(scheduledTime), 
      status: 'pending' 
    });

    const actionTime = new Date();

    if (log) {
      // SCENARIO A: Log exists (created by Automation). UPDATE IT.
      log.status = status;
      log.notes = notes || log.notes;
      log.actionTime = actionTime;
      
      // If marking as missed manually, set the flag so the watchdog doesn't alert again
      if (status === 'missed') {
        log.caregiverNotified = true;
      }
      
      await log.save();
      console.log(`Updated existing log for ${medicine.name}`);
    } else {
      // SCENARIO B: Log doesn't exist. CREATE NEW ONE.
      log = await DoseLog.create({
        user: req.user._id,
        medicine: medicineId,
        scheduledTime,
        status,
        notes,
        actionTime,
        caregiverNotified: status === 'missed' // Set true if missed
      });
      console.log(`Created new log for ${medicine.name}`);
    }

    // ---------------------------------------------------------
    // 4. NEW LOGIC: SEND ALERT IF USER MANUALLY CLICKS "MISSED"
    // ---------------------------------------------------------
    if (status === 'missed') {
      const caregiver = await Caregiver.findOne({ user: req.user._id });

      if (caregiver && caregiver.alertPreferences.missedDose) {
        const timeString = new Date(scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const subject = `⚠️ Missed Dose Reported: ${req.user.name}`;
        const html = `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ffcccc; background-color: #fff5f5;">
            <h2 style="color: #d9534f; margin-top: 0;">User Reported Missed Dose</h2>
            <p>Hello ${caregiver.name},</p>
            <p><b>${req.user.name}</b> has manually marked the following medication as <b>MISSED</b> in the app.</p>
            
            <div style="background-color: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
              <p>💊 <b>Medicine:</b> ${medicine.name}</p>
              <p>⏰ <b>Scheduled Time:</b> ${timeString}</p>
              <p>📝 <b>Reason/Notes:</b> ${notes || "No reason provided."}</p>
            </div>

            <p>Please check in with them.</p>
            <p><i>- MedMate Alert System</i></p>
          </div>
        `;
        
        // Send email without blocking the response
        sendEmail(caregiver.email, subject, html).catch(err => console.error("Failed to send manual missed email:", err));
      }
    }
    // ---------------------------------------------------------

    // 5. Handle Stock Decrement (Only if taken)
    if (status === 'taken' && medicine.stock > 0) {
      medicine.stock -= 1;
      await medicine.save();
    }

    res.status(201).json({
      message: 'Log recorded successfully.',
      log,
      updatedStock: medicine.stock,
    });
  } catch (error) {
    console.error("Error in recordDoseAction:", error);
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


// --------------------------------------------------------------
// UPDATED: Get recent 30 logs (EXCLUDING PENDING)
// --------------------------------------------------------------
const getRecentLogs = async (req, res) => {
  try {
    const logs = await DoseLog.find({ 
      user: req.user._id,
      // Only get logs where status is 'taken' OR 'missed'
      status: { $in: ['taken', 'missed'] } 
    })
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