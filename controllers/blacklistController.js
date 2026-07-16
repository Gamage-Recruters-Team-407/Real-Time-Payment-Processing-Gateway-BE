import Blacklist from '../models/Blacklist.js';
import FraudLog from '../models/FraudLog.js';

export const getBlacklist = async (req, res) => {
  try {
    const list = await Blacklist.find().sort({ addedAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const removeFromBlacklist = async (req, res) => {
  try {
    const { id } = req.params;
    await Blacklist.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const reInvestigateEntity = async (req, res) => {
  try {
    const { id } = req.params;
    const blacklistEntry = await Blacklist.findById(id);
    if (!blacklistEntry) return res.status(404).json({ success: false, error: 'Not found' });

    const alert = await FraudLog.findOne({ userId: blacklistEntry.entityId }).sort({ createdAt: -1 });
    await Blacklist.findByIdAndDelete(id);

    if (alert) {
      alert.status = 'ESCALATED';
      alert.alertReason = 'Re-investigation requested from Fraud List';
      await alert.save();
      return res.json({ success: true, alertId: alert._id });
    }
    
    res.json({ success: true, alertId: null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
