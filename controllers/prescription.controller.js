// controllers/prescription.controller.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const transcribePrescription = async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ message: 'No image data provided.' });
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.0, 
      }
    });

    // The STRICT Prompt
    const prompt = `
    You are an expert, strict pharmacist. Your job is to analyze the uploaded image.
    
    Step 1: Determine if the image is a valid medical prescription, a doctor's note, or a medicine label.
    If the image is completely unrelated, set "isValidPrescription" to false, provide a "reason", and return an empty array for "medicines".
    
    Step 2: Extract the medications.
    
    Return strictly a JSON object with this EXACT structure:
    {
      "isValidPrescription": boolean,
      "reason": "If invalid, explain why. If valid, leave empty.",
      "medicines": [
        {
          "medicineName": "Name of the drug",
          "dosage": "Strength (e.g., 50mg). Use 'Unknown' if missing.",
          "frequency": "Plain English frequency (e.g., 'Twice a day', 'Once a week')",
          "scheduleType": "MUST BE ONE OF: 'daily', 'weekly', 'custom', 'interval'",
          "parsedTimes": ["Array of strings in HH:mm 24-hour format"],
          "daysOfWeek": ["Array of short day names: 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'. Empty if daily."],
          "customIntervalDays": "Number of days for custom intervals (e.g., 30 for monthly). Use null if not applicable.",
          "instructions": "Extract any clinical notes, reasons, or special instructions from the 'Remarks' or 'Instructions' column (e.g., 'LV Dysfunction', 'After food'). Leave empty if missing."
        }
      ]
    }

    CRITICAL RULES:
    - EXCLUDE ANY MEDICATION that is strictly 'SOS', 'PRN', or 'As needed'. Do not include them in the array, as they do not require scheduled alarms.
    
    RULES FOR "scheduleType" & "daysOfWeek":
    - Standard daily medication (1-0-1, TID, etc) -> "scheduleType": "daily", "daysOfWeek": [], "customIntervalDays": null
    - "Weekly", "Once a week", or specific day -> "scheduleType": "weekly", "daysOfWeek": ["Sun"] (default to Sun if unspecified), "customIntervalDays": null
    - "Monthly", "Once a month" -> "scheduleType": "custom", "customIntervalDays": 30, "daysOfWeek": []

    RULES FOR "parsedTimes":
    - 1-0-1, BID, Twice a day -> ["09:00", "21:00"]
    - 1-1-1, TID, Thrice a day -> ["08:00", "14:00", "20:00"]
    - 0-0-1, Night, Bedtime -> ["21:00"]
    - 1-0-0, Morning -> ["09:00"]
    - 0-1-0, Afternoon -> ["14:00"]
    - Exact times (e.g., 8 AM and 8 PM) -> ["08:00", "20:00"]
    - If weekly or monthly and time is unspecified -> ["09:00"]
    `;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType || "image/jpeg"
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    
    const extractedData = JSON.parse(responseText);

    if (!extractedData.isValidPrescription) {
      return res.status(400).json({ 
        message: 'Invalid Image Detected',
        reason: extractedData.reason || 'This image does not appear to be a prescription or medicine label.'
      });
    }

    if (!extractedData.medicines || extractedData.medicines.length === 0) {
      return res.status(400).json({ 
        message: 'No Scheduled Medicines Found',
        reason: 'The image looks like a medical document, but no scheduled medicines were found (SOS/As-needed medications are ignored).'
      });
    }

    res.status(200).json({ 
      message: 'Prescription transcribed successfully',
      medicines: extractedData.medicines 
    });

  } catch (error) {
    console.error('Prescription Transcription Error:', error);
    res.status(500).json({ message: 'Failed to analyze the prescription image. Please try again.' });
  }
};

module.exports = { transcribePrescription };