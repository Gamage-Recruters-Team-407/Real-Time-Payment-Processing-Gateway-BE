import { Router } from "express";
import {
  createTransaction,
  exportTransactions,
  getTransactionById,
  getTransactionHistory,
  getTransactions,
  updateTransactionStatus,
} from "../controllers/TransactionController.js";
import { getTransactionSummary } from "../controllers/TransactionController.js";

const router = Router();

router.get("/export", exportTransactions);
router.get("/", getTransactions);
router.get("/:id/history", getTransactionHistory);
router.get("/summary", getTransactionSummary);
router.get("/:id", getTransactionById);
router.post("/", createTransaction);
router.put("/:id/status", updateTransactionStatus);

export default router;
