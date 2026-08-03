import { Router } from "express";

import {
  createTransaction,
  exportTransactions,
  getTransactionById,
  getTransactionHistory,
  getTransactions,
  getTransactionSummary,
  updateTransactionStatus,
} from "../controllers/TransactionController.js";

import { generatePaymentReceipt } from "../controllers/ReceiptController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/export", exportTransactions);
router.get("/summary", getTransactionSummary);

/*
 * Normal authenticated users can download their own receipts.
 * Admin users can download any receipt.
 */
router.get(
  "/:id/receipt",
  authMiddleware,
  generatePaymentReceipt
);

router.get("/:id/history", getTransactionHistory);
router.get("/:id", getTransactionById);

router.get("/", getTransactions);
router.post("/", createTransaction);
router.put("/:id/status", updateTransactionStatus);

export default router;