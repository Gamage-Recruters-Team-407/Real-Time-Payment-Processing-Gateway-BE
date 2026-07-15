import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  analyst: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const timelineEventSchema = new mongoose.Schema({
  event: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const investigationSchema = new mongoose.Schema({
  caseId: { type: String, required: true, unique: true },
  transactionId: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['CREATE', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED'], 
    default: 'CREATE' 
  },
  priority: { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 
    default: 'MEDIUM' 
  },
  assignedTo: { type: String },
  escalatedBy: { type: String },
  escalationReason: { type: String },
  notes: [noteSchema],
  timeline: [timelineEventSchema],
  decision: { type: String, enum: ['BLOCK', 'CLEAR', 'MONITOR', 'PENDING'], default: 'PENDING' }
}, {
  timestamps: true
});

const Investigation = mongoose.model('Investigation', investigationSchema);

export default Investigation;
