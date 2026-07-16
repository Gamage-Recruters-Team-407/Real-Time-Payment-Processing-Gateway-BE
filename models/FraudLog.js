import mongoose from 'mongoose';

const actionSchema = new mongoose.Schema({
  action: { type: String, required: true },
  by: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const fraudLogSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  merchant: { type: String, required: true },
  ip: { type: String },
  deviceId: { type: String },
  riskScore: { type: Number, required: true },
  ruleScore: { type: Number },
  mlScore: { type: Number },
  status: { 
    type: String, 
    enum: ['CLEARED', 'LOW_RISK', 'MEDIUM_RISK', 'REVIEW', 'UNDER_REVIEW', 'HIGH_RISK', 'BLOCKED', 'ESCALATED'], 
    default: 'REVIEW' 
  },
  alertReason: { type: String },
  actions: [actionSchema],
  investigation: {
    caseId: { type: String },
    notes: { type: String },
    timeline: { type: Array, default: [] }
  },
  whitelisted: { type: Boolean, default: false }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

const FraudLog = mongoose.model('FraudLog', fraudLogSchema);

export default FraudLog;
