import express from 'express';
import {
   seedRates,
   createRate,
   getAllRates,
   updateRate,
   deleteRate,
   getAllCountries,
   calculateDomesticRate
 } from '../controllers/rateController.js';
 import authMiddleware from '../middlewares/authMiddleware.js';
 const router = express.Router();
 
 // Seed initial rates
 router.post('/seed', seedRates);
 
 // Calculate domestic rate
 router.post('/domestic/calculate', calculateDomesticRate);
 
 // CRUD
 router.post('/', authMiddleware, createRate); 
router.post('/seed', seedRates)       // Create
router.get('/', getAllRates);  
router.get('/countries', getAllCountries)      // Read
router.put('/:id', authMiddleware, updateRate);      // Update
router.delete('/:id', authMiddleware, deleteRate);   // Delete

export default router;

