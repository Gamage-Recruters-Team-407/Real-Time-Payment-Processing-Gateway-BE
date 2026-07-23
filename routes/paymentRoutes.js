import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";

import {
  createPayment,
  getAllPayments,
  getPaymentByObjectId,
  getPaymentById,
  updatePaymentStatus,
} from "../controllers/PaymentController.js";

const router = express.Router();

// Create new payment
router.post("/", authMiddleware, createPayment);

// Admin - get all payments
router.get("/admin/all", authMiddleware, getAllPayments);

// Get payment by MongoDB Object ID
router.get("/object/:id", authMiddleware, getPaymentByObjectId);

// Get payment by custom payment ID
router.get("/:paymentId", authMiddleware, getPaymentById);

// Update payment status
router.patch("/:paymentId/status", authMiddleware, updatePaymentStatus);

export default router;