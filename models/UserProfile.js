import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  usualLocation: { type: String },
  usualAmount: { type: Number, default: 0 },
  deviceHistory: [{ type: String }],
  avgTransactionCount: { type: Number, default: 0 },
  transactionHistory: [{ type: String }] // References to transaction IDs
}, {
  timestamps: true
});

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

export default UserProfile;
