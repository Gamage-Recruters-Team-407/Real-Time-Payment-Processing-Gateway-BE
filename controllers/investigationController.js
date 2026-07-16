import { investigationService } from '../services/investigationService.js';

export const startInvestigation = async (req, res) => {
  try {
    const { id } = req.params; // alert ID
    const { assignedTo, priority, notes } = req.body;
    const investigation = await investigationService.startInvestigation(id, assignedTo, priority, notes);
    res.status(201).json({ success: true, investigation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getInvestigationDetails = async (req, res) => {
  try {
    const { id } = req.params; // caseId
    const details = await investigationService.getInvestigationDetails(id);
    res.json(details);
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
};

export const addNote = async (req, res) => {
  try {
    const { id } = req.params; // caseId
    const { content, analyst } = req.body;
    if (!content || !analyst) return res.status(400).json({ success: false, error: "content and analyst are required" });

    const result = await investigationService.addNote(id, content, analyst);
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const handleInvestigationAction = async (req, res) => {
  try {
    const { id } = req.params; // caseId
    const { action, reason, performedBy, notes } = req.body;
    if (!action || !performedBy) return res.status(400).json({ success: false, error: "action and performedBy are required" });

    const { investigation, alert } = await investigationService.handleAction(id, action, reason, performedBy, notes);
    res.json({
      success: true,
      investigation: {
        caseId: investigation.caseId,
        status: investigation.status,
        decision: investigation.decision,
        resolvedAt: new Date()
      },
      transaction: alert ? { id: alert.transactionId, status: alert.status } : null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};