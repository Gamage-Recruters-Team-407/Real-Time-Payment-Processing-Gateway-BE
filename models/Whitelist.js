import mongoose from 'mongoose';

const whitelistSchema = new mongoose.Schema({
  entityId: { type: String, required: true },
  entityType: { 
    type: String, 
    enum: ['ACCOUNT', 'IP', 'DEVICE', 'MERCHANT'], 
    required: true 
  },
  reason: { type: String, required: true },
  addedBy: { type: String, required: true },
  expiresAt: { type: Date, default: null } // null for permanent
}, {
  timestamps: { createdAt: 'addedAt', updatedAt: false }
});

const Whitelist = mongoose.model('Whitelist', whitelistSchema);

export default Whitelist;
