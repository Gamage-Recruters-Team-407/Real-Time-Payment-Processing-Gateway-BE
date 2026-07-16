import express from 'express';

const router = express.Router();

import FraudLog from '../models/FraudLog.js';

// Webhook from Python Alert Handler
router.post('/alert', async (req, res) => {
  const alertData = req.body;
  
  try {
    // Update the existing FraudLog
    await FraudLog.findOneAndUpdate(
      { transactionId: alertData.transactionId },
      { 
        status: alertData.status, 
        riskScore: alertData.riskScore,
        alertReason: alertData.alertReason
      }
    );

    // Get io instance attached to app
    const io = req.app.get('io');
    
    if (io) {
      // Broadcast the new alert to all connected React clients
      io.emit('new_alert', alertData);
      console.log(`[WebSocket] Emitted new_alert for transaction: ${alertData.transactionId}`);
      res.status(200).json({ success: true, message: 'Alert pushed to UI' });
    } else {
      console.error('[WebSocket] io instance not found on app');
      res.status(500).json({ success: false, message: 'WebSocket not initialized' });
    }
  } catch (err) {
    console.error('Failed to update FraudLog from webhook', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
