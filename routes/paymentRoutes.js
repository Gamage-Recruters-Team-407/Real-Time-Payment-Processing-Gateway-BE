import express from "express";

import {
  createPayment,
  getAllPayments,
  getPaymentByObjectId,
  getPaymentById,
  updatePaymentStatus,
} from "../controllers/PaymentController.js";

const router = express.Router();

// Create new payment
router.post("/", createPayment);

// Admin - get all payments
router.get("/admin/all", getAllPayments);

// Get payment by MongoDB Object ID
router.get("/object/:id", getPaymentByObjectId);

// Get payment by custom payment ID
router.get("/:paymentId", getPaymentById);

// Update payment status
router.patch("/:paymentId/status", updatePaymentStatus);

export default router;