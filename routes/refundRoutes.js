import express from "express";
import upload from "../middleware/uploadMiddleware.js";

import {
    createRefund,
    getAllRefunds,
    getRefundById,
    approveRefund,
    rejectRefund,
    refundPayment,
    deleteRefund,
} from "../controllers/RefundController.js";

const router = express.Router();

// Submit refund request with Cloudinary image upload
router.post(
    "/",
    upload.single("itemPhoto"),
    createRefund
);

// Get all refunds
router.get("/all", getAllRefunds);

// Get refund by ID
router.get("/:id", getRefundById);

// Approve refund
router.put("/:id/approve", approveRefund);

// Reject refund
router.put("/:id/reject", rejectRefund);

// Mark as refunded
router.put("/:id/refund", refundPayment);

// Delete refund
router.delete("/:id", deleteRefund);

export default router;