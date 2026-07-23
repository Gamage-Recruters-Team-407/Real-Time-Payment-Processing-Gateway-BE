import mongoose from 'mongoose';

const blacklistSchema = new mongoose.Schema({
  entityId: { type: String, required: true },
  entityType: { 
    type: String, 
    enum: ['ACCOUNT', 'IP', 'DEVICE', 'MERCHANT'], 
    required: true 
  },
  reason: { type: String, required: true },
  addedBy: { type: String, required: true }
}, {
  timestamps: { createdAt: 'addedAt', updatedAt: false }
});

const Blacklist = mongoose.model('Blacklist', blacklistSchema);

export default Blacklist;
