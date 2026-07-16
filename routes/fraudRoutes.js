import express from 'express';
import { 
  getDashboardMetrics, 
  getTransactions, 
  getAlerts, 
  getAlertById, 
  processTransaction
} from '../controllers/FraudController.js';
import { handleAction } from '../controllers/actionController.js';
import { handleWhitelist } from '../controllers/whitelistController.js';
import { handleReview } from '../controllers/reviewController.js';

// Day 5 Controllers
import { startInvestigation, getInvestigationDetails, addNote, handleInvestigationAction } from '../controllers/investigationController.js';
import { getEntityLinkData } from '../controllers/entityLinkController.js';
import { getRegionalVelocity } from '../controllers/regionalController.js';

const router = express.Router();

// Dashboard & Lists
router.get('/dashboard', getDashboardMetrics);
router.get('/transactions', getTransactions);
router.get('/alerts', getAlerts);

// Detail
router.get('/alerts/:id', getAlertById);

// Action APIs (Day 4)
router.post('/transactions/:id/action', handleAction);
router.post('/transactions/:id/review', handleReview);
router.post('/whitelist', handleWhitelist);

// Investigation APIs (Day 5)
router.post('/alerts/:id/investigate', startInvestigation);
router.get('/investigation/:id', getInvestigationDetails);
router.post('/investigation/:id/note', addNote);
router.post('/investigation/:id/action', handleInvestigationAction);

// Graph & Analytics APIs (Day 5)
router.get('/entity-link/:id', getEntityLinkData);
router.get('/regional-velocity', getRegionalVelocity);

// Ingestion
router.post('/process', processTransaction);

export default router;