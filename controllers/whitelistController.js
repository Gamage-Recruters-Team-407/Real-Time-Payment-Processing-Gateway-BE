import { whitelistService } from '../services/whitelistService.js';

export const handleWhitelist = async (req, res) => {
  try {
    const { entityType, entityId, reason, expiresAt, performedBy } = req.body;
    
    if (!entityType || !entityId || !reason) {
      return res.status(400).json({ success: false, error: "entityType, entityId, and reason are required" });
    }

    // Remap user's provided entityType to exactly match schema if needed (e.g. USER -> ACCOUNT)
    let type = entityType.toUpperCase();
    if (type === 'USER') type = 'ACCOUNT';

    const whitelistData = {
      entityType: type,
      entityId,
      reason,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      addedBy: performedBy
    };

    const entry = await whitelistService.addEntity(whitelistData);

    res.status(201).json({
      success: true,
      whitelist: {
        id: entry._id,
        entityType: entry.entityType,
        entityId: entry.entityId,
        reason: entry.reason,
        addedBy: entry.addedBy,
        addedAt: entry.addedAt
      }
    });
  } catch (error) {
    console.error('Error in whitelist API:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to add to whitelist' });
  }
};
