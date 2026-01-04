const cron = require('node-cron');
const Schedule = require('../models/schedule.model');
const DoseLog = require('../models/logs.model');
const Medicine = require('../models/medicine.model');
const Caregiver = require('../models/caregiver.model');
const User = require('../models/user.model');
const { sendEmail } = require('./notification.service');

const startAutomation = async () => {
  console.log('✅ Automation Service: Engine Started...');

  // 1. IMMEDIATE STARTUP CHECK
  // (Protects against server restarts or crashes at midnight)
  console.log('🔄 [Startup] Performing immediate log generation...');
  await generateDailyLogs();

  // ============================================================
  // JOB 1: THE GENERATOR (Runs Every Hour)
  // Why hourly? To catch new schedules added mid-day and handle
  // timezone offsets better than a single midnight run.
  // ============================================================
  cron.schedule('0 * * * *', async () => {
    console.log('📅 [Generator] Hourly log check initiated...');
    await generateDailyLogs();
  });

  // ============================================================
  // JOB 2: THE WATCHDOG (Runs Every 30 Minutes)
  // Checks for "Pending" logs that are 30+ mins overdue.
  // ============================================================
  cron.schedule('*/30 * * * *', async () => {
    console.log('👀 [Watchdog] Checking for missed doses...');
    await checkMissedDoses();
  });

  // ============================================================
  // JOB 3: INVENTORY MANAGER (Runs Daily at 6:00 AM)
  // Checks for Low Stock (<10) and Expiry (Next 7 days).
  // ============================================================
  cron.schedule('0 6 * * *', async () => {
    console.log('📦 [Inventory] Running daily health check...');
    await runDailyHealthCheck();
  });

  // ============================================================
  // JOB 4: WEEKLY REPORT CARD (Runs Sundays at 11:00 PM)
  // Purpose: Sends a summary of the week's adherence to caregivers.
  // ============================================================
  cron.schedule('0 23 * * 0', async () => {
    console.log('📊 [Weekly Report] Generating summaries...');
    await generateWeeklyReport();
  });

  // ============================================================
  // JOB 5: THE JANITOR (Runs Daily at 4:00 AM)
  // Purpose: Delete accounts created >24h ago that are NOT verified.
  // ============================================================
  cron.schedule('0 4 * * *', async () => {
    console.log('🧹 [Janitor] Starting cleanup of unverified users...');
    await cleanupDeadUsers();
  });
};

// ------------------------------------------------------------------
// 🛠️ LOGIC: GENERATE DAILY LOGS
// ------------------------------------------------------------------
async function generateDailyLogs() {
  try {
    const today = new Date();
    // Note: This uses Server Time. For global apps, you might need user-specific timezones.
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const currentDayName = dayNames[today.getDay()];

    // 1. Fetch all ACTIVE schedules
    const schedules = await Schedule.find({ isActive: true });

    for (const schedule of schedules) {
      let shouldGenerate = false;

      // 2. Check Frequency Rules
      if (schedule.frequency === 'daily') {
        shouldGenerate = true;
      } else if (schedule.frequency === 'weekly') {
        if (schedule.daysOfWeek.includes(currentDayName)) {
          shouldGenerate = true;
        }
      }
      // (Add 'interval' or 'custom' logic here if needed)

      if (shouldGenerate) {
        for (const timeStr of schedule.times) {
          // Parse "HH:mm"
          const [hours, minutes] = timeStr.split(':').map(Number);
          
          // Create specific Date object for Today at this time
          const scheduledTime = new Date();
          scheduledTime.setHours(hours, minutes, 0, 0);

          // 3. IDEMPOTENCY CHECK (The Critical Fix)
          // We check if a log already exists for this User + Medicine + Time
          const exists = await DoseLog.findOne({
            user: schedule.user,
            medicine: schedule.medicine,
            scheduledTime: scheduledTime
          });

          // Only create if it doesn't exist
          if (!exists) {
            await DoseLog.create({
              user: schedule.user,
              medicine: schedule.medicine,
              scheduledTime: scheduledTime,
              status: 'pending',
              caregiverNotified: false
            });
          }
        }
      }
    }
    // console.log('✅ [Generator] Log generation complete.');
  } catch (error) {
    console.error('❌ [Generator] Error:', error);
  }
}

// ------------------------------------------------------------------
// 🚨 LOGIC: WATCHDOG (MISSED DOSE)
// ------------------------------------------------------------------
async function checkMissedDoses() {
  try {
    const now = new Date();
    // Grace Period: 30 minutes
    const gracePeriodLimit = new Date(now.getTime() - 30 * 60000); 

    // 1. Find logs: Pending + Overdue + Not Notified
    const missedLogs = await DoseLog.find({
      status: 'pending',
      scheduledTime: { $lte: gracePeriodLimit },
      caregiverNotified: false
    }).populate('user').populate('medicine');

    for (const log of missedLogs) {
      if (!log.user || !log.medicine) continue;

      console.log(`❗ Missed Dose Detected: ${log.user.name} - ${log.medicine.name}`);

      // 2. Mark as Missed
      log.status = 'missed';
      log.caregiverNotified = true;
      await log.save();

      // 3. Find Caregiver
      const caregiver = await Caregiver.findOne({ user: log.user._id });
      
      // 4. Send Alert
      if (caregiver && caregiver.alertPreferences.missedDose) {
        const timeString = new Date(log.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const subject = `🚨 MISSED DOSE ALERT: ${log.user.name}`;
        const html = `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ffcccc; background-color: #fff5f5;">
            <h2 style="color: #d9534f; margin-top: 0;">⚠️ Missed Dose Alert</h2>
            <p>Hello ${caregiver.name},</p>
            <p><b>${log.user.name}</b> has not confirmed taking their medication.</p>
            <div style="background-color: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
              <p>💊 <b>Medicine:</b> ${log.medicine.name}</p>
              <p>⏰ <b>Scheduled Time:</b> ${timeString}</p>
            </div>
            <p>Please contact them immediately.</p>
          </div>
        `;
        
        await sendEmail(caregiver.email, subject, html);
        console.log(`   -> 📧 Alert sent to ${caregiver.email}`);
      }
    }
  } catch (error) {
    console.error('❌ [Watchdog] Error:', error);
  }
}

// ------------------------------------------------------------------
// 📦 LOGIC: INVENTORY & EXPIRY
// ------------------------------------------------------------------
async function runDailyHealthCheck() {
  try {
    const alertsMap = {}; 
    const LOW_STOCK_THRESHOLD = 10;
    const DAYS_WARNING = 7;
    const today = new Date();
    const warningDate = new Date();
    warningDate.setDate(today.getDate() + DAYS_WARNING);

    // 1. Fetch Issues
    const lowStockMeds = await Medicine.find({ stock: { $lte: LOW_STOCK_THRESHOLD } }).populate('user');
    const expiringMeds = await Medicine.find({ expiryDate: { $gte: today, $lte: warningDate } }).populate('user');

    // Helper to initialize map
    const initUserEntry = (med) => {
      const userId = med.user._id.toString();
      if (!alertsMap[userId]) {
        alertsMap[userId] = {
          userName: med.user.name,
          userId: userId,
          lowStock: [],
          expiring: []
        };
      }
      return userId;
    };

    // Group Data
    lowStockMeds.forEach(med => { if (med.user) { const id = initUserEntry(med); alertsMap[id].lowStock.push(med); } });
    expiringMeds.forEach(med => { if (med.user) { const id = initUserEntry(med); alertsMap[id].expiring.push(med); } });

    // 2. Process & Send
    for (const userId in alertsMap) {
      const alertData = alertsMap[userId];
      const caregiver = await Caregiver.findOne({ user: userId });

      if (!caregiver) continue;

      let finalLowStock = caregiver.alertPreferences.lowStock ? alertData.lowStock : [];
      let finalExpiry = caregiver.alertPreferences.expiryAlert ? alertData.expiring : [];

      if (finalLowStock.length === 0 && finalExpiry.length === 0) continue;

      const emailContent = buildInventoryEmail(caregiver.name, alertData.userName, finalLowStock, finalExpiry);
      const subject = `Daily Health Update for ${alertData.userName}`;

      await sendEmail(caregiver.email, subject, emailContent);
      console.log(`   -> 📧 Inventory Alert sent to ${caregiver.email}`);
    }
  } catch (error) {
    console.error('❌ [Inventory] Error:', error);
  }
}


// ------------------------------------------------------------------
// 📊 LOGIC: WEEKLY REPORT (Updated with Time)
// ------------------------------------------------------------------
async function generateWeeklyReport() {
    try {
      // 1. Calculate the Date Range (Last 7 Days)
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7); 
  
      // 2. Fetch all logs from the last week
      const logs = await DoseLog.find({
        scheduledTime: { $gte: start, $lte: end }
      }).populate('user').populate('medicine');
  
      // 3. Group Logs by User
      const reportMap = {};
  
      logs.forEach(log => {
        // Safety check: ensure user and medicine still exist
        if (!log.user || !log.medicine) return;
  
        const userId = log.user._id.toString();
        
        if (!reportMap[userId]) {
          reportMap[userId] = {
            user: log.user,
            total: 0,
            taken: 0,
            missed: 0,
            history: [] 
          };
        }
  
        const entry = reportMap[userId];
        entry.total += 1;
        
        if (log.status === 'taken') entry.taken += 1;
        if (log.status === 'missed') entry.missed += 1;
  
        // --- 👇 THIS IS THE CHANGE 👇 ---
        if (log.status === 'missed') {
          // Format: "Jan 03 at 08:30 PM"
          const dateObj = new Date(log.scheduledTime);
          const formattedTime = dateObj.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          });
  
          entry.history.push(`<b>${log.medicine.name}</b>: ${formattedTime}`);
        }
        // -------------------------------
      });
  
      // 4. Generate and Send Emails
      for (const userId in reportMap) {
        const stats = reportMap[userId];
  
        const caregiver = await Caregiver.findOne({ user: userId });
        
        if (caregiver && caregiver.receivesWeeklySummary) {
          
          const adherenceScore = stats.total === 0 ? 0 : Math.round((stats.taken / stats.total) * 100);
          
          const subject = `Weekly Health Report for ${stats.user.name}`;
          // Note: No change needed to buildWeeklyEmail, as it just prints the strings we created above
          const html = buildWeeklyEmail(caregiver.name, stats.user.name, stats, adherenceScore);
  
          await sendEmail(caregiver.email, subject, html);
          console.log(`   -> 📊 Weekly Report sent to ${caregiver.email}`);
        }
      }
    } catch (error) {
      console.error('❌ [Weekly Report] Error:', error);
    }
}

// ------------------------------------------------------------------
// 🧹 LOGIC: CLEANUP DEAD USERS
// ------------------------------------------------------------------
async function cleanupDeadUsers() {
    try {
      // 1. Define "Dead" Time (24 hours ago)
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24);
  
      // 2. Find and Delete
      // Logic: Created BEFORE cutoff AND Phone NOT verified AND Email NOT verified
      const result = await User.deleteMany({
        createdAt: { $lt: cutoffDate },
        isPhoneVerified: false,
        isEmailVerified: false
      });
  
      if (result.deletedCount > 0) {
        console.log(`   -> 🗑️ Deleted ${result.deletedCount} unverified users.`);
      } else {
        console.log('   -> No unverified users found to delete.');
      }
    } catch (error) {
      console.error('❌ [Janitor] Error:', error);
    }
}


function buildInventoryEmail(caregiverName, patientName, lowStockList, expiryList) {
  let html = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2>MedMate Inventory Update</h2>
      <p>Hello ${caregiverName},</p>
      <p>Here is the status report for <b>${patientName}</b>.</p>
  `;

  if (lowStockList.length > 0) {
    html += `<h3 style="color: #d9534f;">⚠️ Low Stock</h3><ul>${lowStockList.map(m => `<li><b>${m.name}</b>: ${m.stock} left</li>`).join('')}</ul>`;
  }

  if (expiryList.length > 0) {
    html += `<h3 style="color: #f0ad4e;">📅 Expiry Warnings</h3><ul>${expiryList.map(m => `<li><b>${m.name}</b>: Expires ${new Date(m.expiryDate).toDateString()}</li>`).join('')}</ul>`;
  }

  html += `<p>Please check the app for details.</p></div>`;
  return html;
}

// Helper to build the HTML email
function buildWeeklyEmail(caregiverName, patientName, stats, score) {
    let color = '#5cb85c'; // Green (Good)
    if (score < 80) color = '#f0ad4e'; // Orange (Warning)
    if (score < 50) color = '#d9534f'; // Red (Danger)
  
    let html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
        <h2 style="color: #333;">MedMate Weekly Summary</h2>
        <p>Hello ${caregiverName},</p>
        <p>Here is how <b>${patientName}</b> did with their medications this past week.</p>
        
        <div style="text-align: center; padding: 20px; background-color: #f9f9f9; margin: 20px 0;">
          <h1 style="color: ${color}; font-size: 48px; margin: 0;">${score}%</h1>
          <p style="margin: 0; color: #777;">Adherence Score</p>
        </div>
  
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">✅ Taken</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;"><b>${stats.taken}</b></td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">❌ Missed</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;"><b>${stats.missed}</b></td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">💊 Total Scheduled</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;"><b>${stats.total}</b></td>
          </tr>
        </table>
    `;
  
    if (stats.missed > 0) {
      html += `
        <h3 style="color: #d9534f;">Missed Doses Details:</h3>
        <ul>${stats.history.map(item => `<li>${item}</li>`).join('')}</ul>
      `;
    }
  
    html += `<p>Keep up the great support!</p></div>`;
    return html;
}

module.exports = startAutomation;