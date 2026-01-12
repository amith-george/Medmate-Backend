This is my project overview, study this and tell me how and where should I start from:

🔍 Project Overview

MedMate is a mobile health application built using React Native with a Node.js backend and MongoDB database, designed specifically for individuals on long-term or routine medications. Its primary goal is to improve medication adherence by automating reminders, monitoring stock and expiry, and keeping caregivers informed—all while minimizing complexity for the end user.

Users can add medicines either manually or by uploading a prescription image, from which the system extracts medicine names, dosage details, and duration using OCR (Optical Character Recognition) and text parsing. Once added, each medicine entry includes a custom time period, and reminders will repeat daily or as configured, continuing until the medicine stock runs out.

The app sends timely reminders at scheduled times, with a cascading alert sequence if the user fails to confirm dose intake. If no confirmation is received even after multiple alerts, caregivers receive real-time notifications via SMS or email. Users can manage their medicine stock manually or allow the app to extract stock data from the uploaded prescription. The app will notify users when a medicine is nearing expiry or when the stock is low.

Rather than using pill recognition or camera-based identification, the app focuses on prescription scanning, simplifying medicine management while ensuring accuracy. Users' privacy is maintained by not storing prescriptions permanently—data is extracted and then discarded.

For caregiver support, MedMate sends out a weekly summary report via email detailing missed doses. Caregivers are not required to have an account on the app but can still stay updated through real-time alerts and weekly digests.

To enhance user experience and engagement, the app integrates an AI chatbot that answers general health-related queries. While it is not a substitute for professional medical advice, the chatbot provides information on symptoms and medications using pre-trained models or APIs like Gemini. A disclaimer is shown to remind users to always consult healthcare professionals for serious conditions.

The app will also feature offline support, a clean UI with dark mode, and an emphasis on usability and accessibility, especially for older adults and caregivers.

And this is my backend folder structure as well:

MEDMATE-SERVER/
├── config/
│   └── firebase-config.js
├── controllers/
│   ├── caregiver.controller.js
│   ├── logs.controller.js
│   ├── medicine.controller.js
│   ├── schedule.controller.js
│   └── user.controller.js
├── database/
│   └── connect.js
├── middleware/
│   └── authMiddleware.js
├── models/
│   ├── caregiver.model.js
│   ├── logs.model.js
│   ├── medicine.model.js
│   ├── schedule.model.js
│   └── user.model.js
├── node_modules/
├── routes/
│   ├── caregiver.routes.js
│   ├── logs.routes.js
│   ├── medicine.routes.js
│   ├── schedule.routes.js
│   └── user.routes.js
├── services/
│   ├── cron.service.js
│   └── notification.service.js
├── utils/
├── .env
├── .gitignore
├── firebase-service-account-key.json
├── package-lock.json
├── package.json
├── README.md
└── server.js


And this is my frontend folder structure:

MMEDMATE/
├── .expo/
├── .vscode/
├── android/
├── app/
├── config/
│   ├── google-services.json
│   └── GoogleService-Info.plist
├── ios/
├── node_modules/
├── scripts/
├── src/
│   ├── api/
│   │   └── axiosConfig.js
│   ├── assets/
│   ├── components/
│   │   ├── AddMedicineModal.js
│   │   ├── AnimatedBackground.js
│   │   ├── haptic-tab.tsx
│   │   ├── MedicineForm.js
│   │   ├── ScheduleForm.js
│   │   ├── themed-text.tsx
│   │   └── themed-view.tsx
│   ├── constants/
│   │   ├── colors.js
│   │   └── theme.ts
│   ├── context/
│   ├── hooks/
│   │   ├── use-color-scheme.ts
│   │   ├── use-color-scheme.web.ts
│   │   ├── use-theme-color.ts
│   │   └── useCurrentTime.js
│   ├── navigation/
│   │   ├── AppNavigator.js
│   │   └── TabNavigator.js
│   ├── screens/
│   │   ├── HistoryScreen.js
│   │   ├── HomeScreen.js
│   │   ├── IntroScreen.js
│   │   ├── LoginScreen.js
│   │   ├── MedicineDetailScreen.js
│   │   ├── OTPScreen.js
│   │   ├── PillsScreen.js
│   │   ├── ProfileScreen.js
│   │   └── RegisterScreen.js
│   ├── state/
│   │   ├── authSlice.js
│   │   ├── logsSlice.js
│   │   ├── medicineSlice.js
│   │   ├── scheduleSlice.js
│   │   └── store.js
│   └── utils/
│       ├── avatarUtils.js
│       └── validation.js
├── App.js
├── .gitignore
├── app.json
├── eas.json
├── eslint.config.js
├── expo-env.d.ts
├── index.js
├── package-lock.json
├── package.json
├── README.md
└── tsconfig.json