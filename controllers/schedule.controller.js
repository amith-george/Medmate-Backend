const Schedule = require('../models/schedule.model.js');
const Medicine = require('../models/medicine.model.js');
const User = require('../models/user.model.js'); 

// Create a new medicine schedule
const createSchedule = async (req, res) => {
  // Destructure all possible fields from the new model
  const {
    medicineId,
    frequency,
    times,
    daysOfWeek,
    intervalHours,
    customIntervalDays,
    startDate,
    endDate,
    instructions,
    isActive,
  } = req.body;

  if (!medicineId || !frequency) {
    return res.status(400).json({ message: 'Medicine ID and frequency are required.' });
  }

  try {
    // Verify the medicine belongs to the user
    const medicine = await Medicine.findOne({ _id: medicineId, user: req.user._id });
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found or you are not authorized.' });
    }

    // Check if a schedule for this medicine already exists
    const scheduleExists = await Schedule.findOne({ medicine: medicineId });
    if (scheduleExists) {
      return res
        .status(400)
        .json({ message: 'A schedule for this medicine already exists. Please update it instead.' });
    }

    // Create a new schedule instance with all provided data
    const schedule = new Schedule({
      medicine: medicineId,
      user: req.user._id,
      frequency,
      times,
      daysOfWeek,
      intervalHours,
      customIntervalDays,
      startDate,
      endDate,
      instructions,
      isActive,
    });

    // The validation logic is now handled by the pre-save hook in your model
    const createdSchedule = await schedule.save();
    res.status(201).json(createdSchedule);
  } catch (error) {
    // Catch validation errors from the model
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};


// Get all of the user's medicine schedules
const getAllMySchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find({ user: req.user._id }).populate(
      'medicine',
      'name dosage'
    );
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};


// Get the schedule for a single medicine by its ID
const getScheduleForMedicine = async (req, res) => {
  try {
    const { medicineId } = req.params;

    // Find the schedule that matches the medicineId AND the logged-in user's ID
    const schedule = await Schedule.findOne({ 
      medicine: medicineId, 
      user: req.user._id 
    }).populate('medicine', 'name dosage');

    if (schedule) {
      res.json(schedule);
    } else {
      res.status(404).json({ message: 'Schedule for this medicine not found or user not authorized.' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};


// Get today's upcoming reminders
const getTodaysReminders = async (req, res) => {
  try {
    // Use the user's timezone for accurate calculations
    const timeZone = req.user.timeZone || 'Asia/Kolkata';
    const now = new Date();

    // Get current time and day in user's timezone
    const currentTime = now.toLocaleTimeString('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const todayDay = now.toLocaleDateString('en-US', { timeZone, weekday: 'short' }); // "Mon", "Tue", etc.

    const allSchedules = await Schedule.find({
      user: req.user._id,
      isActive: true,
      startDate: { $lte: now }, // Schedule must have started
      $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }], // and not ended
    }).populate('medicine', 'name dosage stock');

    const upcomingReminders = allSchedules
      .map((schedule) => {
        let upcomingTimes = [];
        let isDueToday = false;

        switch (schedule.frequency) {
          case 'daily':
            isDueToday = true;
            break;
          case 'weekly':
            isDueToday = schedule.daysOfWeek.includes(todayDay);
            break;
        }

        if (isDueToday) {
          upcomingTimes = schedule.times.filter((time) => time >= currentTime);
        }

        if (upcomingTimes.length > 0) {
          return {
            ...schedule.toObject(),
            times: upcomingTimes, // Only show upcoming times for today
          };
        }
        return null; // Return null if no reminders for today
      })
      .filter((schedule) => schedule !== null) // Filter out the nulls
      .sort((a, b) => a.times[0].localeCompare(b.times[0])); // Sort by the next upcoming time

    res.json(upcomingReminders);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};


// Update a medicine schedule
const updateSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      _id: req.params.id,
      user: req.user._id, // Ensure the schedule belongs to the logged-in user
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found or user not authorized.' });
    }

    // Update all fields from the model if they are present in the request body
    const updates = [
      'frequency',
      'times',
      'daysOfWeek',
      'intervalHours',
      'customIntervalDays',
      'startDate',
      'endDate',
      'instructions',
      'isActive',
    ];

    updates.forEach((field) => {
      if (req.body[field] !== undefined) {
        schedule[field] = req.body[field];
      }
    });

    const updatedSchedule = await schedule.save();
    res.json(updatedSchedule);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};


// Delete a medicine schedule
const deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (schedule) {
      await schedule.deleteOne();
      res.json({ message: 'Schedule removed successfully.' });
    } else {
      res.status(404).json({ message: 'Schedule not found or user not authorized.' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};


module.exports = {
  createSchedule,
  getAllMySchedules,
  getScheduleForMedicine,
  getTodaysReminders,
  updateSchedule,
  deleteSchedule,
};