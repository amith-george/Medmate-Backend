const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./database/connect.js');
const userRoutes = require('./routes/user.routes.js');
const medicineRoutes = require('./routes/medicine.routes.js');
const caregiverRoutes = require('./routes/caregiver.routes.js');
const scheduleRoutes = require('./routes/schedule.routes.js');
const logRoutes = require('./routes/logs.routes.js');

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());


app.use('/users', userRoutes);
app.use('/medicine', medicineRoutes);
app.use('/caregiver', caregiverRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/logs', logRoutes); 


const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});