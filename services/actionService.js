import FraudLog from '../models/FraudLog.js';
import Investigation from '../models/Investigation.js';
import Blacklist from '../models/Blacklist.js';

export const actionService = {
  freezeTransaction: async (id, notes, performedBy) => {
    let alert;
    try { alert = await FraudLog.findById(id); } catch (e) {}
    if (!alert) alert = await FraudLog.findOne({ transactionId: id });
    if (!alert) throw new Error("Transaction not found");
    
    alert.status = 'FROZEN';
    alert.actions.push({ action: 'FREEZE', by: performedBy, notes });
    await alert.save();
    
    return alert;
  },
  
  blockTransaction: async (id, notes, performedBy) => {
    let alert;
    try { alert = await FraudLog.findById(id); } catch (e) {}
    if (!alert) alert = await FraudLog.findOne({ transactionId: id });
    if (!alert) throw new Error("Transaction not found");
    
    alert.status = 'BLOCKED';
    alert.actions.push({ action: 'BLOCK', by: performedBy, notes });
    await alert.save();
    
    // Auto add to blacklist
    try {
      const blacklistEntry = new Blacklist({
        entityType: 'ACCOUNT',
        entityId: alert.userId,
        reason: notes || 'Auto-blacklisted due to BLOCK action',
        addedBy: performedBy
      });
      await blacklistEntry.save();
    } catch (e) {
      console.error("Failed to add to blacklist (maybe already exists):", e.message);
    }
    
    // Close investigation if exists
    try {
      const investigation = await Investigation.findOne({ transactionId: alert.transactionId });
      if (investigation && investigation.status !== 'CLOSED') {
        investigation.status = 'CLOSED';
        investigation.resolution = notes;
        await investigation.save();
      }
    } catch (e) {
      console.error("Failed to close investigation:", e.message);
    }
    
    return alert;
  },
  
  releaseTransaction: async (id, notes, performedBy) => {
    let alert;
    try { alert = await FraudLog.findById(id); } catch (e) {}
    if (!alert) alert = await FraudLog.findOne({ transactionId: id });
    if (!alert) throw new Error("Transaction not found");
    
    alert.status = 'CLEARED';
    alert.actions.push({ action: 'RELEASE', by: performedBy, notes });
    await alert.save();
    
    // Close investigation if exists
    try {
      const investigation = await Investigation.findOne({ transactionId: alert.transactionId });
      if (investigation && investigation.status !== 'CLOSED') {
        investigation.status = 'CLOSED';
        investigation.resolution = notes;
        await investigation.save();
      }
    } catch (e) {
      console.error("Failed to close investigation:", e.message);
    }
    
    return alert;
  }
};