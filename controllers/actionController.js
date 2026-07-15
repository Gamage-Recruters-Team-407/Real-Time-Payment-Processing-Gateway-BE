import { actionService } from '../services/actionService.js';

export const handleAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes, performedBy } = req.body;
    
    if (!action) {
      return res.status(400).json({ success: false, error: "Action is required" });
    }

    let updatedTransaction;
    const actionUpper = action.toUpperCase();

    if (actionUpper === 'FREEZE') {
      updatedTransaction = await actionService.freezeTransaction(id, notes, performedBy || 'System');
    } else if (actionUpper === 'BLOCK') {
      updatedTransaction = await actionService.blockTransaction(id, notes, performedBy || 'System');
    } else if (actionUpper === 'RELEASE') {
      updatedTransaction = await actionService.releaseTransaction(id, notes, performedBy || 'System');
    } else {
      return res.status(400).json({ success: false, error: "Invalid action type. Must be FREEZE, BLOCK, or RELEASE." });
    }

    res.json({
      success: true,
      transaction: {
        id: updatedTransaction.transactionId,
        status: updatedTransaction.status,
        updatedAt: updatedTransaction.updatedAt
      }
    });
  } catch (error) {
    console.error('Error in action API:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to process action' });
  }
};