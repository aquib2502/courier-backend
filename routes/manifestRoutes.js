// routes/manifestRoutes.js
import express from 'express';
import {
  createManifest,
  getManifestsByUser,
  getManifestById,
  updateManifestStatus,
  getPackedOrdersForManifest,
  getAllManifests
} from '../controllers/manifestController.js';

const router = express.Router();

// Create new manifest
router.post('/create', createManifest);

// Get all manifests for a user

router.get('/getallmanifest', getAllManifests)

router.get('/user/:userId', getManifestsByUser);

// Get manifest by ID
router.get('/:manifestId', getManifestById);

// Update manifest status
router.put('/:manifestId/status', updateManifestStatus);

// Get packed orders available for manifesting
router.get('/orders/packed/:userId', getPackedOrdersForManifest);

export default router;