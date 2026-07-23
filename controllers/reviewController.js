import { reviewService } from '../services/reviewService.js';

export const handleReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, notes, performedBy } = req.body;
    
    if (!decision) {
      return res.status(400).json({ success: false, error: "Decision is required" });
    }

    const updatedTransaction = await reviewService.reviewTransaction(id, decision, notes, performedBy || 'System');

    res.json({
      success: true,
      transaction: {
        id: updatedTransaction.transactionId,
        status: updatedTransaction.status,
        reviewedBy: performedBy || 'System',
        reviewedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error in review API:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to process review' });
  }
};
