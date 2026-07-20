import FraudLog from '../models/FraudLog.js';
import Investigation from '../models/Investigation.js';
import Blacklist from '../models/Blacklist.js';
import Whitelist from '../models/Whitelist.js';
import { mlClient } from './mlClient.js';
import { createNotification } from './notificationService.js';
import { getIO } from '../utils/socket.js';

export const fraudService = {
  // Task 2.X: Process a new transaction
  processTransaction: async (transactionData) => {
    // Call the unified Python ML & Rule Engine service
    let finalScore = 0;
    let ruleScore = 0;
    let mlScore = null;
    let status = 'REVIEW';
    let reasons = [];
    
    const mlResponse = await mlClient.predictFraud(transactionData);
    
    if (mlResponse) {
      // The Python Microservice successfully returned a verdict
      ruleScore = mlResponse.rule_score;
      mlScore = mlResponse.probability * 100;
      finalScore = mlResponse.risk_score;
      reasons = mlResponse.reasons || [];
      
      // Map status strictly to the risk score as requested
      // The user wants below 50% to be low score
      if (mlResponse.verdict === 'BLOCK') {
        status = 'BLOCKED';
      } else if (finalScore >= 80) {
        status = 'HIGH_RISK';
      } else if (finalScore >= 50) {
        status = 'MEDIUM_RISK';
      } else {
        status = 'LOW_RISK';
      }
    } else {
      // Fallback if Python service is offline
      status = 'MEDIUM_RISK';
      finalScore = 50; 
      ruleScore = 50;
      reasons = ['Fallback: Python Microservice is unreachable'];
    }

    let finalLocation = transactionData.location || 'Unknown';
    if (finalLocation === 'Unknown' && transactionData.ip && transactionData.ip !== 'Unknown') {
      try {
        const ipResponse = await fetch(`http://ip-api.com/json/${transactionData.ip}`);
        const ipData = await ipResponse.json();
        if (ipData.status === 'success') {
          finalLocation = `${ipData.city}, ${ipData.country}`;
        }
      } catch (e) {
        console.warn('Failed to fetch IP location', e);
      }
    }

    // Save to MongoDB
    const fraudLog = new FraudLog({
      transactionId: transactionData.transactionId,
      userId: transactionData.userId,
      amount: transactionData.amount,
      merchant: transactionData.merchant,
      ip: transactionData.ip,
      deviceId: transactionData.deviceId,
      riskScore: finalScore,
      ruleScore: ruleScore,
      status: status,
      alertReason: reasons.join(', '),
      actions: [],
      location: finalLocation,
      lat: transactionData.lat,
      lon: transactionData.lon
    });

    await fraudLog.save();

    if (status === 'BLOCKED' && transactionData.userId) {
      createNotification({
        userId: transactionData.userId,
        type: "security",
        title: "Suspicious transaction blocked",
        message: `A transaction of ${transactionData.amount ?? ""} was blocked for review (risk score ${finalScore}).`,
        actionLabel: "Review activity",
      }).catch((err) => console.error("Failed to create security notification:", err.message));
    }

    if (['HIGH_RISK', 'BLOCKED', 'REVIEW', 'MEDIUM_RISK', 'ESCALATED', 'LOW_RISK'].includes(status)) {
      try {
        const io = getIO();
        if (io) {
          io.emit('new_alert', {
            id: fraudLog._id,
            transactionId: fraudLog.transactionId,
            timestamp: fraudLog.createdAt || new Date(),
            accountId: fraudLog.userId,
            amount: fraudLog.amount,
            riskScore: fraudLog.riskScore,
            severity: fraudLog.status === 'BLOCKED' ? 'CRITICAL' : (fraudLog.status === 'HIGH_RISK' ? 'HIGH' : 'MEDIUM'),
            alertReason: fraudLog.alertReason,
            actions: ['INVESTIGATE', 'FREEZE', 'DISMISS'],
            ip: fraudLog.ip,
            merchant: fraudLog.merchant
          });
        }
      } catch (err) {
        console.error('Socket error:', err);
      }
    }

    return {
      finalScore,
      status,
      ruleScore,
      mlScore,
      reasons
    };
  },

  // Task 2.2: Dashboard Metrics API
  getDashboardMetrics: async () => {
    const blockedAttempts = await FraudLog.countDocuments({ status: 'BLOCKED' });
    const suspiciousPatterns = await FraudLog.countDocuments({});
    const fraudListCount = await Blacklist.countDocuments({});
    
    // Distinct users with riskScore > 80
    const highRiskEntities = (await FraudLog.distinct('userId', { riskScore: { $gt: 80 } })).length;
    
    // Count all transactions that have not yet been resolved (still need Review or Investigate)
    const openCases = await FraudLog.countDocuments({ status: { $in: ['LOW_RISK', 'MEDIUM_RISK', 'HIGH_RISK', 'REVIEW', 'UNDER_REVIEW'] } });
    const escalated = await Investigation.countDocuments({ status: 'ESCALATED' });

    return {
      fraudList: { value: fraudListCount, change: "+0%" },
      blockedAttempts: { value: blockedAttempts, change: "+0%" },
      suspiciousPatterns: { value: suspiciousPatterns, status: "Real-time AI monitoring active" },
      highRiskEntities: { value: highRiskEntities, openCases, escalated }
    };
  },

  // Task 2.3: Transaction List API
  getTransactions: async (queryFilters) => {
    const { status, search, page = 1, limit = 20, sortField = 'createdAt', sortOrder = 'desc' } = queryFilters;
    const filter = {};

    if (status) {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { merchant: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const transactions = await FraudLog.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await FraudLog.countDocuments(filter);

    // Populate whitelisted flag
    const whitelistedEntities = await Whitelist.find().select('entityId');
    const whitelistedIds = new Set(whitelistedEntities.map(w => w.entityId));

    const data = transactions.map(tx => {
      const txObj = tx.toObject();
      if (whitelistedIds.has(txObj.userId) || whitelistedIds.has(txObj.ip) || whitelistedIds.has(txObj.deviceId) || whitelistedIds.has(txObj.merchant)) {
        txObj.whitelisted = true;
      }
      return txObj;
    });

    return {
      data,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    };
  },

  // Task 2.4: Alert List API
  getAlerts: async () => {
    // Get all blacklisted and whitelisted entity IDs to filter them out of new alerts
    const blacklistedEntities = await Blacklist.find().select('entityId');
    const whitelistedEntities = await Whitelist.find().select('entityId');
    const excludedIds = [
      ...blacklistedEntities.map(b => b.entityId),
      ...whitelistedEntities.map(w => w.entityId)
    ];

    // Only flag/suspicious transactions
    const alerts = await FraudLog.find({ 
      status: { $in: ['HIGH_RISK', 'MEDIUM_RISK', 'REVIEW', 'BLOCKED', 'ESCALATED', 'LOW_RISK'] },
      userId: { $nin: excludedIds },
      ip: { $nin: excludedIds },
      deviceId: { $nin: excludedIds },
      merchant: { $nin: excludedIds }
    }).sort({ createdAt: -1 }).limit(50); // Limit volume since it's a live feed

    // Map to alert format
    return alerts.map(alert => ({
      id: alert._id,
      transactionId: alert.transactionId,
      timestamp: alert.createdAt,
      accountId: alert.userId,
      amount: alert.amount,
      riskScore: alert.riskScore,
      severity: alert.status === 'BLOCKED' ? 'CRITICAL' : (alert.status === 'HIGH_RISK' ? 'HIGH' : 'MEDIUM'),
      alertReason: alert.alertReason,
      actions: ['INVESTIGATE', 'FREEZE', 'DISMISS'],
      ip: alert.ip,
      merchant: alert.merchant
    }));
  },

  // Task 2.5: Alert Detail API
  getAlertById: async (id) => {
    let alert;
    if (id === 'USER-DEFAULT') {
      alert = await FraudLog.findOne().sort({ createdAt: -1 });
    } else {
      try {
        // Might be a valid ObjectId
        alert = await FraudLog.findById(id);
      } catch (err) {
        // Not a valid ObjectId, ignore
      }

      if (!alert) {
        alert = await FraudLog.findOne({ transactionId: id });
      }
      
      if (!alert) {
        // Try treating it as a userId
        alert = await FraudLog.findOne({ userId: id }).sort({ createdAt: -1 });
      }
    }

    if (!alert) return null;

    // Fetch investigation data if exists
    let investigation = await Investigation.findOne({ transactionId: alert.transactionId });

    return {
      transactionDetails: {
        id: alert.transactionId,
        userId: alert.userId,
        amount: alert.amount,
        merchant: alert.merchant,
        ip: alert.ip,
        deviceId: alert.deviceId,
        timestamp: alert.createdAt
      },
      riskInformation: {
        riskScore: alert.riskScore,
        ruleScore: alert.ruleScore,
        alertReason: alert.alertReason,
        status: alert.status
      },
      investigationData: investigation || null,
      actionHistory: alert.actions || [],
      entityLinks: {
        accountId: alert.userId
      }
    };
  }
};