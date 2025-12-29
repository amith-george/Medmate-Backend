const express = require('express');
const router = express.Router();
const {
  createMedicine,
  getMyMedicines,
  updateMedicine,
  deleteMedicine,
  getMedicineById,
} = require('../controllers/medicine.controller.js');
const { protect } = require('../middleware/authMiddleware.js');

router.use(protect);

// Create a new medicine
router.post('/create', createMedicine);

// Get all medicines for the logged-in user
router.get('/list', getMyMedicines);

// Get a single medicine by its ID
router.get('/list/:id', getMedicineById);

// Update a medicine by its ID
router.put('/update/:id', updateMedicine);

// Delete a medicine by its ID
router.delete('/delete/:id', deleteMedicine);

module.exports = router;