import FraudLog from '../models/FraudLog.js';
import UserProfile from '../models/UserProfile.js';
import Investigation from '../models/Investigation.js';
import { evaluateRules } from './ruleEngine.js';
import { calculateRisk } from './riskScore.js';

export const fraudService = {
  // Task 2.X: Process a new transaction
  processTransaction: async (transactionData) => {
    // 1 & 2. Run rules
    const { ruleScore, reasons } = await evaluateRules(transactionData);
    
    // 3 - 6. Calculate Risk Score and Status
    // Assume mlScore comes from somewhere else later (Day 3), for now it's null
    const { finalScore, status } = calculateRisk(ruleScore, null);

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
      mlScore: null,
      reasons
    };
  },

  // Task 2.2: Dashboard Metrics API
  getDashboardMetrics: async () => {
    const blockedAttempts = await FraudLog.countDocuments({ status: 'BLOCKED' });
    const suspiciousPatterns = await FraudLog.countDocuments({ status: 'HIGH_RISK' });
    
    // Distinct users with riskScore > 80
    const highRiskEntities = (await FraudLog.distinct('userId', { riskScore: { $gt: 80 } })).length;
    
    // Using Investigation model for cases
    const openCases = await Investigation.countDocuments({ status: { $in: ['CREATE', 'UNDER_REVIEW'] } });
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
        { merchant: { $regex: search, $options: 'i' } }
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
      status: { $in: ['HIGH_RISK', 'REVIEW', 'BLOCKED', 'ESCALATED'] } 
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
    const alert = await FraudLog.findById(id);
    if (!alert) return null;

    // Fetch investigation data if exists
    let investigation = await Investigation.findOne({ transactionId: alert.transactionId });

    return {
      transactionDetails: {
        id: alert.transactionId,
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