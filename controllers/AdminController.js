import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import Refund from "../models/Refund.js";

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
 * @desc    Returns high level system overview statistics
 */
export const getDashboardOverview = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));

    const [
      totalUsers,
      pendingMerchants,
      totalTransactions,
      todayTransactions,
      totalRevenueAgg,
      todayRevenueAgg,
      approvedRefundAgg,
      failedTransactionsToday,
      successfulTransactions,
      
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "Merchant Administrator", status: "pending" }),
      Transaction.countDocuments({}),
      Transaction.countDocuments({ createdAt: { $gte: startOfToday } }),
      Transaction.aggregate([
        { $match: { status: "Successful" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            status: "Successful",
            createdAt: { $gte: startOfToday },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

Refund.aggregate([
  {
    $match:{
      status:"APPROVED"
    }
  },
  {
    $group:{
      _id:null,
      totalRefund:{
        $sum:"$amount"
      }
    }
  }
]),



      Transaction.countDocuments({
        status: "Failed",
        createdAt: { $gte: startOfToday },
      }),
      Transaction.countDocuments({ status: "Successful" }),
    ]);

    const totalCount = totalTransactions || 1;
    const successRate = ((successfulTransactions / totalCount) * 100).toFixed(1);

    const overview = {
      revenue: {
  total:
    (totalRevenueAgg[0]?.total || 0) -
    (approvedRefundAgg[0]?.totalRefund || 0),

  todayChangePct: 12.5,
},
      transactions: {
        today: todayTransactions,
        successRate: parseFloat(successRate),
      },
      merchants: {
        pendingApproval: pendingMerchants,
      },
      users: {
        total: totalUsers,
        newThisWeek: 8,
      },
      generatedAt: new Date().toISOString(),
    };

    return sendSuccess(res, overview, "Dashboard overview fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * @route   GET /api/admin/dashboard/transaction-trend
 * @desc    Returns time-series transaction volume data for charts
 */
export const getTransactionTrend = async (req, res) => {
  try {
    const range = req.query.range || "7d";
    let startDate = new Date();
    const endDate = new Date();
    
    // Set start date based on range
    switch (range) {
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "12m":
        startDate.setMonth(startDate.getMonth() - 12);
        break;
      case "7d":
      default:
        startDate.setDate(startDate.getDate() - 7);
        break;
    }
    
    // Reset time to start of day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const trend = await Transaction.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: endDate } 
        } 
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    // Create a map of existing dates
    const trendMap = new Map();
    trend.forEach(item => {
      trendMap.set(item._id.date, {
        totalAmount: Math.round(item.totalAmount),
        count: item.count,
      });
    });

    // Generate all dates in range
    const result = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const existingData = trendMap.get(dateStr);
      
      result.push({
        date: dateStr,
        totalAmount: existingData?.totalAmount || 0,
        count: existingData?.count || 0,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return sendSuccess(res, result, "Transaction trend fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * @route   GET /api/admin/dashboard/recent-activity
 * @desc    Returns recent activity feed from transactions
 */
export const getRecentActivity = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 4, 20);

    const recentTransactions = await Transaction.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("transactionId status amount customerName createdAt paymentMethod");

    const activity = recentTransactions.map((transaction) => {
      let type = "approval";
      let title = "";
      let subtitle = "";

      switch (transaction.status) {
        case "Successful":
          type = "settlement";
          title = `Payment of LKR ${transaction.amount?.toFixed(2) || "0.00"} completed`;
          subtitle = `Transaction ${transaction.transactionId || "Unknown"}`;
          break;
        case "Failed":
          type = "flag";
          title = `Transaction ${transaction.transactionId || "Unknown"} failed`;
          subtitle = `Payment method: ${transaction.paymentMethod || "Unknown"}`;
          break;
        case "Pending":
          type = "invite";
          title = `Transaction ${transaction.transactionId || "Unknown"} pending`;
          subtitle = `Waiting for payment confirmation`;
          break;
        case "Processing":
          type = "approval";
          title = `Transaction ${transaction.transactionId || "Unknown"} processing`;
          subtitle = `Payment is being processed`;
          break;
        case "Cancelled":
          type = "flag";
          title = `Transaction ${transaction.transactionId || "Unknown"} cancelled`;
          subtitle = `Cancelled by customer or merchant`;
          break;
        default:
          type = "approval";
          title = `Transaction ${transaction.transactionId || "Unknown"} ${transaction.status || "updated"}`;
          subtitle = transaction.customerName || "Unknown customer";
      }

      const timeAgo = getTimeAgo(transaction.createdAt);

      return {
        id: transaction._id,
        type,
        title,
        subtitle,
        time: timeAgo,
      };
    });

    return sendSuccess(res, activity, "Recent activity fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * Helper: Get time ago string
 */
function getTimeAgo(date) {
  if (!date) return "Just now";
  
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

/**
 * @route   GET /api/admin/dashboard/system-health
 * @desc    Returns system health status
 */
export const getSystemHealth = async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
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
 * @route   GET /api/admin/dashboard/status-distribution
 * @desc    Returns transaction status distribution
 */
export const getTransactionStatusDistribution = async (req, res) => {
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
 * @route   GET /api/admin/dashboard/recent-transactions
 * @desc    Returns recent transactions for dashboard
 */
export const getRecentTransactions = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);

    const transactions = await Transaction.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("transactionId customerName amount status paymentMethod createdAt");

    return sendSuccess(res, transactions, "Recent transactions fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * @route   GET /api/admin/dashboard/merchant-stats
 * @desc    Returns merchant statistics
 */
export const getMerchantStats = async (req, res) => {
  try {
    const [totalMerchants, activeMerchants, pendingMerchants, blockedMerchants] = await Promise.all([
      User.countDocuments({ role: "Merchant Administrator" }),
      User.countDocuments({ role: "Merchant Administrator", status: "active" }),
      User.countDocuments({ role: "Merchant Administrator", status: "pending" }),
      User.countDocuments({ role: "Merchant Administrator", status: "blocked" }),
    ]);

    const stats = {
      total: totalMerchants,
      active: activeMerchants,
      pending: pendingMerchants,
      blocked: blockedMerchants,
    };

    return sendSuccess(res, stats, "Merchant stats fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * @route   GET /api/admin/dashboard/payment-method-distribution
 * @desc    Returns payment method distribution
 */
export const getPaymentMethodDistribution = async (req, res) => {
  try {
    const distribution = await Transaction.aggregate([
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const formatted = distribution.map((item) => ({
      method: item._id || "Unknown",
      count: item.count,
      totalAmount: Math.round(item.totalAmount),
    }));

    return sendSuccess(res, formatted, "Payment method distribution fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * @route   GET /api/admin/dashboard/daily-stats
 * @desc    Returns daily statistics for today
 */
export const getDailyStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    const [totalAmount, transactionCount, successfulCount, failedCount] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfToday, $lte: endOfToday }
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Transaction.countDocuments({
        createdAt: { $gte: startOfToday, $lte: endOfToday }
      }),
      Transaction.countDocuments({
        status: "Successful",
        createdAt: { $gte: startOfToday, $lte: endOfToday }
      }),
      Transaction.countDocuments({
        status: "Failed",
        createdAt: { $gte: startOfToday, $lte: endOfToday }
      }),
    ]);

    const stats = {
      date: startOfToday.toISOString().split('T')[0],
      totalAmount: totalAmount[0]?.total || 0,
      transactionCount: transactionCount,
      successfulCount: successfulCount,
      failedCount: failedCount,
      successRate: transactionCount > 0 ? ((successfulCount / transactionCount) * 100).toFixed(1) : 0,
    };

    return sendSuccess(res, stats, "Daily stats fetched successfully");
  } catch (error) {
    return sendError(res, error);
  }
};