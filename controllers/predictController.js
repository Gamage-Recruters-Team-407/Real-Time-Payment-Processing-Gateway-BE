import FraudLog from '../models/FraudLog.js';
import { mlClient } from '../services/mlClient.js';

export const runLivePrediction = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the transaction by ID, or if it's a user ID, find the latest transaction for that user
    let transaction = await FraudLog.findOne({ transactionId: id }).lean();
    if (!transaction) {
      transaction = await FraudLog.findOne({ _id: id }).lean();
    }
    if (!transaction) {
      // Maybe it's a user ID? Let's get the latest for that user.
      transaction = await FraudLog.findOne({ userId: id }).sort({ createdAt: -1 }).lean();
    }

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Entity not found for prediction" });
    }

    // Call ML client
    const prediction = await mlClient.predictFraud(transaction);
    
    if (prediction) {
      // Return the prediction to the UI
      return res.status(200).json({ success: true, prediction, entity: transaction });
    } else {
      return res.status(500).json({ success: false, message: "ML Microservice failed to return prediction." });
    }
  } catch (error) {
    console.error("Live Prediction Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
