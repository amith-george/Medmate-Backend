const express = require('express');
const router = express.Router();
const { transcribePrescription } = require('../controllers/prescription.controller');
const { protect } = require('../middleware/authMiddleware'); 

router.post('/transcribe', protect, transcribePrescription);

module.exports = router;