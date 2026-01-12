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
  console.log('🔄 [Startup] Performing immediate log generation...');
  await generateDailyLogs();

  // ============================================================
  // JOB 1: THE GENERATOR (Runs Every Hour)
  // ============================================================
  cron.schedule('0 * * * *', async () => {
    console.log('📅 [Generator] Hourly log check initiated...');
    await generateDailyLogs();
  });

  // ============================================================
  // JOB 2a: THE NANNY (Alerts Caregiver) - Runs every 30 mins
  // ============================================================
  cron.schedule('*/30 * * * *', async () => {
    console.log('🔔 [Nanny] Checking for late doses to alert caregiver...');
    await notifyCaregiverOfLateness();
  });

  // ============================================================
  // JOB 2b: THE JANITOR (Cleanup) - Runs every hour
  // ============================================================
  cron.schedule('0 * * * *', async () => {
    console.log('🧹 [Janitor] Cleaning up 3h old pending doses...');
    await cleanupOldMissedDoses();
  });

  // ============================================================
  // JOB 3: INVENTORY MANAGER (Runs Daily at 6:00 AM)
  // ============================================================
  cron.schedule('0 6 * * *', async () => {
    console.log('📦 [Inventory] Running daily health check...');
    await runDailyHealthCheck();
  });

  // ============================================================
  // JOB 4: WEEKLY REPORT CARD (Runs Sundays at 11:00 PM)
  // ============================================================
  cron.schedule('0 23 * * 0', async () => {
    console.log('📊 [Weekly Report] Generating summaries...');
    await generateWeeklyReport();
  });
};

// ------------------------------------------------------------------
// 🛠️ LOGIC: GENERATE DAILY LOGS
// ------------------------------------------------------------------
async function generateDailyLogs() {
  try {
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const currentDayName = dayNames[today.getDay()];

    const schedules = await Schedule.find({ isActive: true });

    for (const schedule of schedules) {
      let shouldGenerate = false;
      if (schedule.frequency === 'daily') {
        shouldGenerate = true;
      } else if (schedule.frequency === 'weekly') {
        if (schedule.daysOfWeek.includes(currentDayName)) {
          shouldGenerate = true;
        }
      }

      if (shouldGenerate) {
        for (const timeStr of schedule.times) {
          const [hours, minutes] = timeStr.split(':').map(Number);
          
          const scheduledTime = new Date();
          scheduledTime.setHours(hours, minutes, 0, 0);

          const exists = await DoseLog.findOne({
            user: schedule.user,
            medicine: schedule.medicine,
            scheduledTime: scheduledTime
          });

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
  } catch (error) {
    console.error('❌ [Generator] Error:', error);
  }
}

// ------------------------------------------------------------------
// 🔔 LOGIC: THE NANNY (Alert Caregiver Only)
// ------------------------------------------------------------------
async function notifyCaregiverOfLateness() {
  try {
    const now = new Date();
    const lateThreshold = new Date(now.getTime() - 60 * 60000);

    const lateLogs = await DoseLog.find({
      status: 'pending',
      scheduledTime: { $lte: lateThreshold },
      caregiverNotified: false 
    }).populate('user').populate('medicine');

    for (const log of lateLogs) {
      if (!log.user || !log.medicine) continue;

      console.log(`⚠️ Late Dose Detected: ${log.user.name} - ${log.medicine.name}`);

      log.caregiverNotified = true;
      await log.save();

      const caregiver = await Caregiver.findOne({ user: log.user._id });
      
      if (caregiver && caregiver.alertPreferences.missedDose) {
        // --- CHANGED HERE: Format Date and Time separately ---
        const scheduledDateObj = new Date(log.scheduledTime);
        
        const dateString = scheduledDateObj.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        }); // e.g., "Fri, Jan 9"
        
        const timeString = scheduledDateObj.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        }); // e.g., "10:30 AM"

        const subject = `⚠️ Late Medication Alert: ${log.user.name}`;
        const html = `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ffcccc; background-color: #fff5f5;">
            <h2 style="color: #d9534f; margin-top: 0;">Medication Not Confirmed</h2>
            <p>Hello ${caregiver.name},</p>
            <p>It has been over an hour since <b>${log.user.name}</b> was scheduled to take their medication.</p>
            <div style="background-color: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
              <p>💊 <b>Medicine:</b> ${log.medicine.name}</p>
              <p>📅 <b>Scheduled:</b> ${dateString} at ${timeString}</p>
              <p>ℹ️ <i>Status is still pending in the app. Please check in.</i></p>
            </div>
          </div>
        `;
        
        await sendEmail(caregiver.email, subject, html);
        console.log(`   -> 📧 Late Alert sent to Caregiver: ${caregiver.email}`);
      }
    }
  } catch (error) {
    console.error('❌ [Nanny] Error:', error);
  }
}

// ------------------------------------------------------------------
// 🧹 LOGIC: THE JANITOR
// ------------------------------------------------------------------
async function cleanupOldMissedDoses() {
  try {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 3 * 60 * 60 * 1000); 

    const result = await DoseLog.updateMany(
      { 
        status: 'pending', 
        scheduledTime: { $lte: cutoffTime } 
      },
      { 
        $set: { 
          status: 'missed',
          notes: 'Auto-marked by System (3h Timeout)',
          caregiverNotified: true 
        } 
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`❗ [Janitor] Marked ${result.modifiedCount} doses as 'missed' (3h timeout).`);
    }
  } catch (error) {
    console.error('❌ [Janitor] Error:', error);
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

    const lowStockMeds = await Medicine.find({ stock: { $lte: LOW_STOCK_THRESHOLD } }).populate('user');
    const expiringMeds = await Medicine.find({ expiryDate: { $gte: today, $lte: warningDate } }).populate('user');

    const initUserEntry = (med) => {
      const userId = med.user._id.toString();
      if (!alertsMap[userId]) {
        alertsMap[userId] = { userName: med.user.name, userId: userId, lowStock: [], expiring: [] };
      }
      return userId;
    };

    lowStockMeds.forEach(med => { if (med.user) { const id = initUserEntry(med); alertsMap[id].lowStock.push(med); } });
    expiringMeds.forEach(med => { if (med.user) { const id = initUserEntry(med); alertsMap[id].expiring.push(med); } });

    for (const userId in alertsMap) {
      const alertData = alertsMap[userId];
      
      // 1. Send to CAREGIVER
      const caregiver = await Caregiver.findOne({ user: userId });
      if (caregiver) {
        let finalLowStock = caregiver.alertPreferences.lowStock ? alertData.lowStock : [];
        let finalExpiry = caregiver.alertPreferences.expiryAlert ? alertData.expiring : [];

        if (finalLowStock.length > 0 || finalExpiry.length > 0) {
          const emailContent = buildInventoryEmail(caregiver.name, alertData.userName, finalLowStock, finalExpiry);
          const subject = `Daily Health Update for ${alertData.userName}`;
          await sendEmail(caregiver.email, subject, emailContent);
          console.log(`   -> 📧 Inventory Alert sent to Caregiver: ${caregiver.email}`);
        }
      }

      // 2. Send to USER
      const user = await User.findById(userId);
      if (user && user.email && user.isEmailVerified && user.preferences?.lowStockExpiryAlerts) {
        if (alertData.lowStock.length > 0 || alertData.expiring.length > 0) {
            const emailContent = buildInventoryEmail(user.name, "Your Medicines", alertData.lowStock, alertData.expiring);
            const subject = `Your MedMate Inventory Alert`;
            await sendEmail(user.email, subject, emailContent);
            console.log(`   -> 📧 Inventory Alert sent to User: ${user.email}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ [Inventory] Error:', error);
  }
}

// ------------------------------------------------------------------
// 📊 LOGIC: WEEKLY REPORT
// ------------------------------------------------------------------
async function generateWeeklyReport() {
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7); 
  
      const logs = await DoseLog.find({
        scheduledTime: { $gte: start, $lte: end }
      }).populate('user').populate('medicine');
  
      const reportMap = {};
  
      logs.forEach(log => {
        if (!log.user || !log.medicine) return;
  
        const userId = log.user._id.toString();
        
        if (!reportMap[userId]) {
          reportMap[userId] = { user: log.user, total: 0, taken: 0, missed: 0, history: [] };
        }
  
        const entry = reportMap[userId];
        entry.total += 1;
        if (log.status === 'taken') entry.taken += 1;
        if (log.status === 'missed') entry.missed += 1;
  
        if (log.status === 'missed') {
          // This already includes the Date + Time
          const formattedTime = new Date(log.scheduledTime).toLocaleString('en-US', { 
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true 
          });
          entry.history.push(`<b>${log.medicine.name}</b>: ${formattedTime}`);
        }
      });
  
      for (const userId in reportMap) {
        const stats = reportMap[userId];
        const adherenceScore = stats.total === 0 ? 0 : Math.round((stats.taken / stats.total) * 100);

        // 1. Send to CAREGIVER
        const caregiver = await Caregiver.findOne({ user: userId });
        if (caregiver && caregiver.receivesWeeklySummary) {
          const subject = `Weekly Health Report for ${stats.user.name}`;
          const html = buildWeeklyEmail(caregiver.name, stats.user.name, stats, adherenceScore);
          await sendEmail(caregiver.email, subject, html);
          console.log(`   -> 📊 Weekly Report sent to Caregiver: ${caregiver.email}`);
        }

        // 2. Send to USER
        const user = await User.findById(userId);
        if (user && user.email && user.isEmailVerified && user.preferences?.weeklyReport) {
            const subject = `Your Weekly MedMate Report`;
            const html = buildWeeklyEmail(user.name, "You", stats, adherenceScore);
            await sendEmail(user.email, subject, html);
            console.log(`   -> 📊 Weekly Report sent to User: ${user.email}`);
        }
      }
    } catch (error) {
      console.error('❌ [Weekly Report] Error:', error);
    }
}

// --- Email Helpers ---
function buildInventoryEmail(recipientName, patientLabel, lowStockList, expiryList) {
  let html = `<div style="font-family: Arial, sans-serif; color: #333;"><h2>MedMate Inventory Update</h2><p>Hello ${recipientName},</p><p>Here is the status report for <b>${patientLabel}</b>.</p>`;
  if (lowStockList.length > 0) html += `<h3 style="color: #d9534f;">⚠️ Low Stock</h3><ul>${lowStockList.map(m => `<li><b>${m.name}</b>: ${m.stock} left</li>`).join('')}</ul>`;
  if (expiryList.length > 0) html += `<h3 style="color: #f0ad4e;">📅 Expiry Warnings</h3><ul>${expiryList.map(m => `<li><b>${m.name}</b>: Expires ${new Date(m.expiryDate).toDateString()}</li>`).join('')}</ul>`;
  html += `<p>Please check the app for details.</p></div>`;
  return html;
}

function buildWeeklyEmail(recipientName, patientLabel, stats, score) {
    let color = score < 50 ? '#d9534f' : score < 80 ? '#f0ad4e' : '#5cb85c';
    const contextPhrase = patientLabel === "You" 
      ? "Here is how <b>You</b> did with your medications this past week." 
      : `Here is how <b>${patientLabel}</b> did with their medications this past week.`;

    let html = `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;"><h2 style="color: #333;">MedMate Weekly Summary</h2><p>Hello ${recipientName},</p><p>${contextPhrase}</p><div style="text-align: center; padding: 20px; background-color: #f9f9f9; margin: 20px 0;"><h1 style="color: ${color}; font-size: 48px; margin: 0;">${score}%</h1><p style="margin: 0; color: #777;">Adherence Score</p></div><table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;"><tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">✅ Taken</td><td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;"><b>${stats.taken}</b></td></tr><tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">❌ Missed</td><td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;"><b>${stats.missed}</b></td></tr><tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">💊 Total Scheduled</td><td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;"><b>${stats.total}</b></td></tr></table>`;
    if (stats.missed > 0) html += `<h3 style="color: #d9534f;">Missed Doses Details:</h3><ul>${stats.history.map(item => `<li>${item}</li>`).join('')}</ul>`;
    html += `<p>Stay healthy!</p></div>`;
    return html;
}

module.exports = startAutomation;