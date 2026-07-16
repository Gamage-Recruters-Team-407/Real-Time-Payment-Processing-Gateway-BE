import FraudLog from '../models/FraudLog.js';
import Investigation from '../models/Investigation.js';
import { evaluateRules } from './ruleEngine.js';
import { calculateRisk } from './riskScore.js';
import { mlClient } from './mlClient.js';
import { runCypher } from './neo4j.js';

export const fraudService = {
  // Task 2.X: Process a new transaction
  processTransaction: async (transactionData) => {
    // 1 & 2. Run rules
    const { ruleScore, reasons } = await evaluateRules(transactionData);
    
    // Day 4: Call ML Model
    let mlScore = null;
    const mlResponse = await mlClient.predictFraud(transactionData);
    if (mlResponse && mlResponse.probability > 0.5) {
      mlScore = mlResponse.risk_score;
      reasons.push(`AI Model identified suspicious pattern (${mlScore}% risk)`);
    } else if (mlResponse) {
      mlScore = mlResponse.risk_score;
    }

    // 3 - 6. Calculate Risk Score and Status
    const { finalScore, status } = calculateRisk(ruleScore, mlScore);

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

    // Save relationships to Neo4j for Entity Link Analysis
    try {
      const cypher = `
        MERGE (u:Account {id: $userId})
        MERGE (ip:Ip {id: $ip})
        MERGE (d:Device {id: $deviceId})
        MERGE (m:Merchant {id: $merchant})
        MERGE (t:Transaction {id: $transactionId})
        MERGE (u)-[:USES_IP]->(ip)
        MERGE (u)-[:USES_DEVICE]->(d)
        MERGE (u)-[:PAYMENT_TO]->(m)
        MERGE (u)-[:PERFORMED]->(t)
      `;
      await runCypher(cypher, {
        userId: transactionData.userId || 'Unknown',
        transactionId: transactionData.transactionId || 'Unknown',
        ip: transactionData.ip || 'Unknown',
        deviceId: transactionData.deviceId || 'Unknown',
        merchant: transactionData.merchant || 'Unknown'
      });
    } catch (e) {
      console.error('Failed to save to Neo4j:', e.message);
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