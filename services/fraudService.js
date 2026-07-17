import FraudLog from '../models/FraudLog.js';
import Investigation from '../models/Investigation.js';
import { mlClient } from './mlClient.js';

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
      // The user wants ANY detection of fraud (medium or high) to automatically BLOCK the transaction
      if (finalScore >= 40 || mlResponse.verdict === 'BLOCK') {
        status = 'BLOCKED';
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
      location: transactionData.location
    });

    await fraudLog.save();

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
    
    // Distinct users with riskScore > 80
    const highRiskEntities = (await FraudLog.distinct('userId', { riskScore: { $gt: 80 } })).length;
    
    // Count all transactions that have not yet been resolved (still need Review or Investigate)
    const openCases = await FraudLog.countDocuments({ status: { $in: ['LOW_RISK', 'MEDIUM_RISK', 'HIGH_RISK', 'REVIEW', 'UNDER_REVIEW'] } });
    const escalated = await Investigation.countDocuments({ status: 'ESCALATED' });

    return {
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

    return {
      data: transactions,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    };
  },

  // Task 2.4: Alert List API
  getAlerts: async () => {
    // Only flag/suspicious transactions
    const alerts = await FraudLog.find({ 
      status: { $in: ['HIGH_RISK', 'MEDIUM_RISK', 'REVIEW', 'BLOCKED', 'ESCALATED'] } 
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