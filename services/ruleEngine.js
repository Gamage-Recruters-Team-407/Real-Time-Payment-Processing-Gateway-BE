import FraudLog from '../models/FraudLog.js';
import UserProfile from '../models/UserProfile.js';
import Blacklist from '../models/Blacklist.js';

export const evaluateRules = async (transaction) => {
  let score = 0;
  const reasons = [];

  const { userId, amount, merchant, ip, deviceId, timestamp } = transaction;
  const transactionTime = new Date(timestamp || Date.now());

  // Get user profile
  const userProfile = await UserProfile.findOne({ userId });

  // 1. Velocity (5+ transactions in 5 minutes)
  const fiveMinsAgo = new Date(transactionTime.getTime() - 5 * 60000);
  const recentTransactions = await FraudLog.countDocuments({
    userId,
    createdAt: { $gte: fiveMinsAgo }
  });
  
  if (recentTransactions >= 5) {
    score += 25;
    reasons.push("Multiple transactions in short time window");
  }

  // 2. Geographic (Location mismatch - simplified by checking if IP matches usual, or passing location in tx)
  // For this exercise, we assume the transaction has a location property
  if (userProfile && transaction.location && userProfile.usualLocation && userProfile.usualLocation !== transaction.location) {
    score += 20;
    reasons.push("Unusual geographic location detected");
  }

  // 3. Amount (Exceeds 2x normal threshold or absolute high amount)
  if (userProfile && userProfile.usualAmount) {
    if (amount > userProfile.usualAmount * 2) {
      score += 15;
      reasons.push("Amount exceeds threshold");
    }
  } else if (amount >= 10000 && amount < 50000) {
    score += 85;
    reasons.push("Unusually high transaction amount for unknown user");
  }

  // 4. Blacklist
  const isBlacklisted = await Blacklist.findOne({
    $or: [
      { entityId: userId, entityType: 'ACCOUNT' },
      { entityId: ip, entityType: 'IP' },
      { entityId: deviceId, entityType: 'DEVICE' },
      { entityId: merchant, entityType: 'MERCHANT' }
    ]
  });

  if (isBlacklisted) {
    score += 30;
    reasons.push(`Blacklisted entity detected (${isBlacklisted.entityType})`);
  }

  // 5. Device (Unknown device)
  if (userProfile && deviceId) {
    if (!userProfile.deviceHistory.includes(deviceId)) {
      score += 10;
      reasons.push("Unknown device detected");
    }
  } else if (!userProfile) {
    // If no user profile, treat as unknown
    score += 10;
    reasons.push("Unknown device detected");
  }

  // 6. Time (12 AM - 5 AM)
  const hour = transactionTime.getUTCHours();
  // Adjust based on timezone if needed, assuming UTC for simplicity
  if (hour >= 0 && hour < 5) {
    score += 10;
    reasons.push("Transaction at unusual time");
  }

  // 7. Merchant (High risk)
  const highRiskMerchants = ['CRYPTO_EXCHANGE', 'CRYPTOEXCHANGE', 'GAMBLING', 'CASINO'];
  // For this exercise, we can do a simple substring match or list check
  if (highRiskMerchants.some(m => merchant.toUpperCase().includes(m))) {
    score += 15;
    reasons.push("High-risk merchant");
  }

  // 8. User History (New user < 24 hours)
  if (userProfile) {
    const ageInHours = (Date.now() - userProfile.createdAt.getTime()) / (1000 * 60 * 60);
    if (ageInHours < 24) {
      score += 10;
      reasons.push("New user with no history");
    }
  } else {
    // Treat unknown users as new
    score += 10;
    reasons.push("New user with no history");
  }

  return { ruleScore: score, reasons };
};