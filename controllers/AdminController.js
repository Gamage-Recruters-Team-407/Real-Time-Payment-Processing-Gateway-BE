const mongoose = require("mongoose");

const User = require("../models/User");                 
const Transaction = require("../models/Transaction");    
const Payment = require("../models/Payment");             
const FraudLog = require("../models/FraudLog");           
const AuditLog = require("../models/AuditLog");           

/**
 * Utility: standard success response
 */
const sendSuccess = (res, data, message = "Success") => {
  return res.status(200).json({ success: true, message, data });
};

/**
 * Utility: standard error response
 */
const sendError = (res, error, statusCode = 500) => {
  console.error("[AdminController] Error:", error.message);
  return res.status(statusCode).json({
    success: false,
    message: error.message || "Internal Server Error",
  });
};

/**
 * @route   GET /api/admin/dashboard/overview
 * @desc    Returns high level system overview statistics used by the
 *          summary cards at the top of the Admin Dashboard.
 * @access  Private (System Administrator only)
 */
exports.getDashboardOverview = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));

    const [
      totalMerchants,
      activeMerchants,
      pendingMerchantApprovals,
      totalUsers,
      totalTransactions,
      todayTransactions,
      totalRevenueAgg,
      todayRevenueAgg,
      pendingFraudAlerts,
      failedTransactionsToday,
    ] = await Promise.all([
      User.countDocuments({ role: "Merchant Administrator" }),
      User.countDocuments({ role: "Merchant Administrator", status: "active" }),
      User.countDocuments({ role: "Merchant Administrator", status: "pending" }),
      User.countDocuments({}),
      Transaction.countDocuments({}),
      Transaction.countDocuments({ createdAt: { $gte: startOfToday } }),
      Transaction.aggregate([
        { $match: { status: "success" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            status: "success",
            createdAt: { $gte: startOfToday },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      FraudLog.countDocuments({ investigationStatus: "pending" }),
      Transaction.countDocuments({
        status: "failed",
        createdAt: { $gte: startOfToday },
      }),
    ]);

    const overview = {
      merchants: {
        total: totalMerchants,
        active: activeMerchants,
        pendingApproval: pendingMerchantApprovals,
      },
      users: {
        total: totalUsers,
      },
      transactions: {
        total: totalTransactions,
        today: todayTransactions,
        failedToday: failedTransactionsToday,
      },
      revenue: {
        total: totalRevenueAgg[0]?.total || 0,
        today: todayRevenueAgg[0]?.total || 0,
      },
      fraud: {
        pendingAlerts: pendingFraudAlerts,
      },
      generatedAt: new Date().toISOString(),
    };

    return sendSuccess(res, overview, "Dashboard overview fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * @route   GET /api/admin/dashboard/transaction-trend?range=7d|30d|12m
 * @desc    Returns time-series transaction volume & revenue data for
 *          rendering line/bar charts on the Admin Dashboard.
 * @access  Private (System Administrator only)
 */
exports.getTransactionTrend = async (req, res) => {
  try {
    const range = req.query.range || "7d";
    let startDate = new Date();
    let groupFormat = "%Y-%m-%d";

    switch (range) {
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        groupFormat = "%Y-%m-%d";
        break;
      case "12m":
        startDate.setMonth(startDate.getMonth() - 12);
        groupFormat = "%Y-%m";
        break;
      case "7d":
      default:
        startDate.setDate(startDate.getDate() - 7);
        groupFormat = "%Y-%m-%d";
        break;
    }

    const trend = await Transaction.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: groupFormat, date: "$createdAt" } },
            status: "$status",
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    // Reshape into { date, success, failed, pending, totalAmount }
    const grouped = {};
    trend.forEach((item) => {
      const date = item._id.date;
      if (!grouped[date]) {
        grouped[date] = { date, success: 0, failed: 0, pending: 0, totalAmount: 0 };
      }
      grouped[date][item._id.status] = item.count;
      grouped[date].totalAmount += item.totalAmount;
    });

    const result = Object.values(grouped);

    return sendSuccess(res, result, "Transaction trend fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * @route   GET /api/admin/dashboard/status-distribution
 * @desc    Returns transaction status breakdown (success / failed / pending)
 *          for rendering a pie / donut chart.
 * @access  Private (System Administrator only)
 */
exports.getTransactionStatusDistribution = async (req, res) => {
  try {
    const distribution = await Transaction.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const formatted = distribution.map((item) => ({
      status: item._id,
      count: item.count,
    }));

    return sendSuccess(res, formatted, "Transaction status distribution fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * @route   GET /api/admin/dashboard/fraud-summary
 * @desc    Returns a summarized snapshot of fraud alerts for the
 *          Fraud Monitoring Summary widget on the Admin Dashboard.
 * @access  Private (System Administrator only)
 */
exports.getFraudSummary = async (req, res) => {
  try {
    const [bySeverity, recentAlerts, totalFlagged] = await Promise.all([
      FraudLog.aggregate([
        { $group: { _id: "$riskLevel", count: { $sum: 1 } } },
      ]),
      FraudLog.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select("transactionId riskLevel riskScore investigationStatus createdAt"),
      FraudLog.countDocuments({ investigationStatus: { $ne: "closed" } }),
    ]);

    const summary = {
      totalFlagged,
      bySeverity: bySeverity.map((s) => ({ level: s._id, count: s.count })),
      recentAlerts,
    };

    return sendSuccess(res, summary, "Fraud summary fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * @route   GET /api/admin/dashboard/recent-transactions?limit=10
 * @desc    Returns the most recent transactions for the dashboard table.
 * @access  Private (System Administrator only)
 */
exports.getRecentTransactions = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const transactions = await Transaction.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("merchantId", "businessName")
      .select("amount status paymentMethod merchantId createdAt");

    return sendSuccess(res, transactions, "Recent transactions fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * @route   GET /api/admin/dashboard/recent-activity?limit=5
 * @desc    Returns a unified recent-activity feed (merchant approvals,
 *          flagged transactions, new user invites, settlements, etc.)
 *          pulled from the Audit Log for the "Recent activity" widget
 *          shown on the Admin Dashboard.
 * @access  Private (System Administrator only)
 */
exports.getRecentActivity = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);

    const activity = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("action description actorName status createdAt");

    return sendSuccess(res, activity, "Recent activity fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * @route   GET /api/admin/dashboard/system-health
 * @desc    Returns basic operational / system health metrics
 *          (per SRS 2.2.17 System Administration -> monitor microservice
 *          health, monitor resource utilization).
 * @access  Private (System Administrator only)
 */
exports.getSystemHealth = async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const dbStatusMap = ["disconnected", "connected", "connecting", "disconnecting"];

    const memoryUsage = process.memoryUsage();

    const health = {
      database: {
        status: dbStatusMap[dbState] || "unknown",
      },
      server: {
        uptimeSeconds: Math.floor(process.uptime()),
        memory: {
          rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + " MB",
          heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + " MB",
        },
        nodeVersion: process.version,
      },
      timestamp: new Date().toISOString(),
    };

    return sendSuccess(res, health, "System health fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * @route   GET /api/admin/dashboard/summary-report
 * @desc    Combines overview + trend + fraud summary into a single
 *          downloadable summary report payload
 *          (per SRS 6.1.1 -> Report generation).
 * @access  Private (System Administrator only)
 */
exports.getSummaryReport = async (req, res) => {
  try {
    const [overviewRes, trendRes, fraudRes] = await Promise.all([
      buildOverviewData(),
      buildTrendData("30d"),
      buildFraudSummaryData(),
    ]);

    const report = {
      overview: overviewRes,
      transactionTrend: trendRes,
      fraudSummary: fraudRes,
      generatedAt: new Date().toISOString(),
    };

    return sendSuccess(res, report, "Summary report generated successfully");
  } catch (error) {
    return sendError(res, error);
  }
};

/* -------------------------------------------------------------------- */
/* Internal helper functions (reused by getSummaryReport)                */
/* -------------------------------------------------------------------- */

async function buildOverviewData() {
  const totalMerchants = await User.countDocuments({ role: "Merchant Administrator" });
  const totalTransactions = await Transaction.countDocuments({});
  const totalRevenueAgg = await Transaction.aggregate([
    { $match: { status: "success" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  return {
    totalMerchants,
    totalTransactions,
    totalRevenue: totalRevenueAgg[0]?.total || 0,
  };
}

async function buildTrendData(range) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (range === "30d" ? 30 : 7));

  return Transaction.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
}

async function buildFraudSummaryData() {
  const totalFlagged = await FraudLog.countDocuments({ investigationStatus: { $ne: "closed" } });
  return { totalFlagged };
}