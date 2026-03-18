---

### 2. Backend Repository (`README.md`)

```markdown
# MedMate 💊 - Backend API

This is the Node.js and Express API that powers the MedMate mobile application. It handles user authentication, complex scheduling logic, automated notifications, caregiver email/SMS digests, and the AI-powered prescription transcription service.

## 🌟 Core Responsibilities

* **Prescription OCR Engine:** Integrates with Google's Gemini API (`gemini-2.5-flash`) to parse uploaded prescription images, extract medication details, and intelligently map shorthand medical frequencies (e.g., 1-0-1, SOS) to exact cron schedules.
* **Automated Scheduling Engine:** Manages complex medication routines (daily, weekly, custom intervals) and triggers the cascading alert sequences for missed doses.
* **Caregiver Notification System:** Dispatches real-time SMS/Email alerts for critically missed doses and compiles weekly summary reports for caregivers without requiring them to have an app account.
* **Inventory Management:** Automatically decrements user medication stock upon dose confirmation and calculates low-stock thresholds.
* **AI Chatbot Endpoints:** Securely bridges communication between the frontend and the Gemini AI model for general health queries.

## 🛠️ Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB (with Mongoose ODM)
* **AI Integration:** Google Generative AI SDK
* **Authentication:** JSON Web Tokens (JWT)
