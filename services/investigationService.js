import Investigation from '../models/Investigation.js';
import FraudLog from '../models/FraudLog.js';
import Blacklist from '../models/Blacklist.js';

export const investigationService = {
  startInvestigation: async (alertId, assignedTo, priority, notes) => {
    const alert = await FraudLog.findById(alertId);
    if (!alert) throw new Error("Alert not found");

    const caseId = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const investigation = new Investigation({
      caseId,
      transactionId: alert.transactionId,
      status: 'UNDER_REVIEW',
      priority: priority || 'MEDIUM',
      assignedTo: assignedTo,
      notes: notes ? [{ analyst: assignedTo, content: notes }] : [],
      timeline: [{ event: 'Case Created', timestamp: new Date() }]
    });

    await investigation.save();

    // Update alert status
    alert.status = 'REVIEW';
    await alert.save();

    return investigation;
  },

  getInvestigationDetails: async (caseId) => {
    const investigation = await Investigation.findOne({ caseId });
    if (!investigation) throw new Error("Investigation not found");

    const alert = await FraudLog.findOne({ transactionId: investigation.transactionId });

    return {
      caseId: investigation.caseId,
      status: investigation.status,
      priority: investigation.priority,
      assignedTo: investigation.assignedTo,
      createdAt: investigation.createdAt,
      transaction: alert ? {
        id: alert.transactionId,
        amount: alert.amount,
        merchant: alert.merchant,
        riskScore: alert.riskScore,
        status: alert.status
      } : null,
      entity: alert ? {
        userId: alert.userId,
        ip: alert.ip,
        deviceId: alert.deviceId,
        location: alert.location
      } : null,
      notes: investigation.notes,
      timeline: investigation.timeline
    };
  },

  addNote: async (caseId, content, analyst) => {
    const investigation = await Investigation.findOne({ caseId });
    if (!investigation) throw new Error("Investigation not found");

    const newNote = { analyst, content, timestamp: new Date() };
    investigation.notes.push(newNote);
    await investigation.save();

    return { note: newNote, totalNotes: investigation.notes.length };
  },

  handleAction: async (caseId, action, reason, performedBy, notes) => {
    const investigation = await Investigation.findOne({ caseId });
    if (!investigation) throw new Error("Investigation not found");

    const alert = await FraudLog.findOne({ transactionId: investigation.transactionId });
    const actionUpper = action.toUpperCase();

    if (notes) {
      investigation.notes.push({ analyst: performedBy, content: notes, timestamp: new Date() });
    }

    if (actionUpper === 'APPROVE') {
      investigation.status = 'RESOLVED';
      investigation.decision = 'CLEAR';
      investigation.timeline.push({ event: `Case Approved by ${performedBy}`, timestamp: new Date() });
      if (alert) { alert.status = 'CLEARED'; await alert.save(); }
    } else if (actionUpper === 'BLOCK') {
      investigation.status = 'RESOLVED';
      investigation.decision = 'BLOCK';
      investigation.timeline.push({ event: `Case Blocked by ${performedBy}. Reason: ${reason}`, timestamp: new Date() });
      if (alert) { 
        alert.status = 'BLOCKED'; await alert.save(); 
        try {
          await new Blacklist({ entityType: 'USER', entityValue: alert.userId, reason, addedBy: performedBy }).save();
        } catch(e) {}
      }
    } else if (actionUpper === 'ESCALATE') {
      investigation.status = 'ESCALATED';
      investigation.priority = 'CRITICAL';
      investigation.escalatedBy = performedBy;
      investigation.escalationReason = reason;
      investigation.timeline.push({ event: `Escalated by ${performedBy}`, timestamp: new Date() });
    } else if (actionUpper === 'CLOSE') {
      investigation.status = 'CLOSED';
      investigation.timeline.push({ event: `Closed by ${performedBy}. Reason: ${reason}`, timestamp: new Date() });
    } else {
      throw new Error("Invalid action type. Must be APPROVE, BLOCK, ESCALATE, CLOSE.");
    }

    await investigation.save();
    return { investigation, alert };
  }
};