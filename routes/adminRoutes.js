import { Router } from "express";
import {
  getDashboardOverview,
  getTransactionTrend,
  getRecentActivity,
  getSystemHealth,
  getTransactionStatusDistribution,
} from "../controllers/AdminController.js";

const router = Router();

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "Admin routes are working!" });
});

router.get("/dashboard/overview", getDashboardOverview);
router.get("/dashboard/transaction-trend", getTransactionTrend);
router.get("/dashboard/recent-activity", getRecentActivity);
router.get("/dashboard/system-health", getSystemHealth);
router.get("/dashboard/status-distribution", getTransactionStatusDistribution);

export default router;