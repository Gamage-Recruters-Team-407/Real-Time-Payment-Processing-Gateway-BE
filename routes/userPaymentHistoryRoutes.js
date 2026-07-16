import { Router } from "express";
import {
  getPaymentHistory,
  getPaymentSummary,
} from "../controllers/UserPaymentHistoryController.js";
import protect from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", protect, getPaymentHistory);
router.get("/summary", protect, getPaymentSummary);

export default router;
