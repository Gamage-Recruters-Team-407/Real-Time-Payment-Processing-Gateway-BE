import Whitelist from '../models/Whitelist.js';

export const whitelistService = {
  addEntity: async (data) => {
    const { entityType, entityId, reason, expiresAt, addedBy } = data;
    
    // Check if already exists
    let entry = await Whitelist.findOne({ entityType, entityId });
    if (entry) {
      entry.reason = reason;
      entry.expiresAt = expiresAt;
      entry.addedBy = addedBy || 'System';
      await entry.save();
    } else {
      entry = new Whitelist({
        entityType,
        entityId,
        reason,
        expiresAt,
        addedBy: addedBy || 'System'
      });
      await entry.save();
    }
    
    return entry;
  }
};
