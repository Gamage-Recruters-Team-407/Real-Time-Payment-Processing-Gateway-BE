import FraudLog from '../models/FraudLog.js';
import Investigation from '../models/Investigation.js';
import Blacklist from '../models/Blacklist.js';

export const reviewService = {
  reviewTransaction: async (id, decision, notes, performedBy) => {
    const alert = await FraudLog.findById(id);
    if (!alert) throw new Error("Transaction not found");
    
    // decision must be APPROVE, FLAG, BLOCK
    const decisionUpper = decision.toUpperCase();
    
    alert.actions.push({ action: 'REVIEW_' + decisionUpper, by: performedBy, notes });
    
    if (decisionUpper === 'APPROVE') {
      alert.status = 'CLEARED';
    } else if (decisionUpper === 'FLAG') {
      alert.status = 'ESCALATED'; 
      
      // Auto-escalate to investigation
      try {
        const existing = await Investigation.findOne({ transactionId: alert.transactionId });
        if (!existing) {
          const inv = new Investigation({
            transactionId: alert.transactionId,
            status: 'ESCALATED',
            assignedTo: performedBy,
            notes: [{ author: performedBy, content: 'Manual FLAG during review: ' + notes }]
          });
          await inv.save();
        }
      } catch (e) {
        console.error("Failed to auto-create investigation:", e.message);
      }
    } else if (decisionUpper === 'BLOCK') {
      alert.status = 'BLOCKED';
      
      // Auto add to blacklist
      try {
        const blacklistEntry = new Blacklist({
          entityType: 'USER',
          entityValue: alert.userId,
          reason: notes || 'Auto-blacklisted due to manual BLOCK review',
          addedBy: performedBy
        });
        await blacklistEntry.save();
      } catch (e) {
        console.error("Failed to add to blacklist:", e.message);
      }
    } else {
      throw new Error("Invalid decision. Must be APPROVE, FLAG, or BLOCK.");
    }
    
    await alert.save();
    return alert;
  }
};
