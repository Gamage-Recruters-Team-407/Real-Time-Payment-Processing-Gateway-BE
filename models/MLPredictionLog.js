import mongoose from 'mongoose';

const mlPredictionLogSchema = new mongoose.Schema({
  transactionId: { type: String, required: true },
  prediction: { type: Number, required: true },
  riskScore: { type: Number, required: true },
  features: { type: mongoose.Schema.Types.Mixed, required: true }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

const MLPredictionLog = mongoose.model('MLPredictionLog', mlPredictionLogSchema);

export default MLPredictionLog;
