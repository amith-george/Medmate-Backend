🔍 Project Overview
MedMate is a mobile health application built using React Native with a Node.js backend and MongoDB database, designed specifically for individuals on long-term or routine medications. Its primary goal is to improve medication adherence by automating reminders, monitoring stock and expiry, and keeping caregivers informed—all while minimizing complexity for the end user.

Users can add medicines either manually or by uploading a prescription image, from which the system extracts medicine names, dosage details, and duration using OCR (Optical Character Recognition) and text parsing. Once added, each medicine entry includes a custom time period, and reminders will repeat daily or as configured, continuing until the medicine stock runs out.

The app sends timely reminders at scheduled times, with a cascading alert sequence if the user fails to confirm dose intake. If no confirmation is received even after multiple alerts, caregivers receive real-time notifications via SMS or email. Users can manage their medicine stock manually or allow the app to extract stock data from the uploaded prescription. The app will notify users when a medicine is nearing expiry or when the stock is low.

Rather than using pill recognition or camera-based identification, the app focuses on prescription scanning, simplifying medicine management while ensuring accuracy. Users' privacy is maintained by not storing prescriptions permanently—data is extracted and then discarded.

For caregiver support, MedMate sends out a weekly summary report via email detailing missed doses. Caregivers are not required to have an account on the app but can still stay updated through real-time alerts and weekly digests.

To enhance user experience and engagement, the app integrates an AI chatbot that answers general health-related queries. While it is not a substitute for professional medical advice, the chatbot provides information on symptoms and medications using pre-trained models or APIs like Gemini. A disclaimer is shown to remind users to always consult healthcare professionals for serious conditions.

The app will also feature offline support, a clean UI with dark mode, and an emphasis on usability and accessibility, especially for older adults and caregivers.