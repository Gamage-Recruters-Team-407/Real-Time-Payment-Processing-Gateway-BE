import express from 'express';
import { 
  getDashboardMetrics, 
  getTransactions, 
  getAlerts, 
  getAlertById, 
  processTransaction,
  handleAlertAction,
  investigateAlert
} from '../controllers/fraudController.js';

const router = express.Router();

// Dashboard & Lists
router.get('/dashboard', getDashboardMetrics);
router.get('/transactions', getTransactions);
router.get('/alerts', getAlerts);

// Detail
router.get('/alerts/:id', getAlertById);

// Actions
router.post('/alerts/:id/action', handleAlertAction);
router.post('/alerts/:id/investigate', investigateAlert);

// Ingestion
router.post('/process', processTransaction);

export default router;