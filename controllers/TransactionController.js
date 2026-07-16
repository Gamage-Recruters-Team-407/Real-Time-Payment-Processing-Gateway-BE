import mongoose from "mongoose";
import Transaction, { TRANSACTION_STATUSES } from "../models/Transaction.js";
import Refund from "../models/Refund.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const DEFAULT_CURRENCY = "LKR";
const SINGLE_SHOP_MERCHANT =
  (process.env.SINGLE_SHOP_MERCHANT || process.env.SHOP_NAME || "Main Shop").trim();

const ALLOWED_STATUS_TRANSITIONS = {
  Pending: ["Processing", "Successful", "Failed", "Cancelled"],
  Processing: ["Successful", "Failed", "Cancelled"],
  Successful: [],
  Failed: [],
  Cancelled: [],
};

const isValidStatus = (status) => TRANSACTION_STATUSES.includes(status);

const generateTransactionId = () =>
  `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

const parsePositiveNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const buildQuery = (query) => {
  const filters = {};
  const andConditions = [];

  const search = (query.search || "").trim();
  if (search) {
    andConditions.push({
      $or: [
        { transactionId: { $regex: search, $options: "i" } },
        { merchantName: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { paymentReference: { $regex: search, $options: "i" } },
      ],
    });
  }

  const merchantName = (query.merchantName || "").trim();
  if (merchantName) {
    andConditions.push({ merchantName: { $regex: merchantName, $options: "i" } });
  }

  const status = (query.status || "").trim();
  if (status) {
    andConditions.push({ status });
  }

  const amountFilters = {};
  const minAmount = parsePositiveNumber(query.minAmount);
  const maxAmount = parsePositiveNumber(query.maxAmount);
  if (minAmount !== undefined) {
    amountFilters.$gte = minAmount;
  }
  if (maxAmount !== undefined) {
    amountFilters.$lte = maxAmount;
  }
  if (Object.keys(amountFilters).length > 0) {
    andConditions.push({ amount: amountFilters });
  }

  const dateFilters = {};
  if (query.startDate) {
    const start = new Date(query.startDate);
    if (!Number.isNaN(start.getTime())) {
      dateFilters.$gte = start;
    }
  }
  if (query.endDate) {
    const end = new Date(query.endDate);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      dateFilters.$lte = end;
    }
  }
  if (Object.keys(dateFilters).length > 0) {
    andConditions.push({ createdAt: dateFilters });
  }

  if (andConditions.length > 0) {
    filters.$and = andConditions;
  }

  return filters;
};

const normalizeTransaction = (payload = {}) => ({
  transactionId: (payload.transactionId || generateTransactionId()).trim(),
  merchantName: SINGLE_SHOP_MERCHANT,
  customerName: (payload.customerName || "").trim(),
  customerEmail: (payload.customerEmail || "").trim(),
  amount: payload.amount,
  currency: (payload.currency || DEFAULT_CURRENCY).trim().toUpperCase(),
  paymentMethod: (payload.paymentMethod || "Unknown").trim(),
  status: (payload.status || "Pending").trim(),
  paymentReference: (payload.paymentReference || "").trim(),
  description: (payload.description || "").trim(),
  metadata: payload.metadata ?? {},
});

const toCsvValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
};

const buildCsv = (transactions) => {
  const headers = [
    "transactionId",
    "merchantName",
    "customerName",
    "customerEmail",
    "amount",
    "currency",
    "paymentMethod",
    "status",
    "paymentReference",
    "description",
    "metadata",
    "createdAt",
    "updatedAt",
  ];

  const rows = transactions.map((transaction) =>
    [
      transaction.transactionId,
      transaction.merchantName,
      transaction.customerName,
      transaction.customerEmail,
      transaction.amount,
      transaction.currency,
      transaction.paymentMethod,
      transaction.status,
      transaction.paymentReference,
      transaction.description,
      transaction.metadata,
      transaction.createdAt,
      transaction.updatedAt,
    ]
      .map(toCsvValue)
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
};

const buildSummary = (transactions, total) => {
  const summary = {
    totalTransactions: total,
    totalAmount: 0,
    pendingCount: 0,
    processingCount: 0,
    successfulCount: 0,
    failedCount: 0,
    cancelledCount: 0,
  };

  transactions.forEach((transaction) => {
    summary.totalAmount += Number(transaction.amount) || 0;

    switch (transaction.status) {
      case "Pending":
        summary.pendingCount += 1;
        break;
      case "Processing":
        summary.processingCount += 1;
        break;
      case "Successful":
        summary.successfulCount += 1;
        break;
      case "Failed":
        summary.failedCount += 1;
        break;
      case "Cancelled":
        summary.cancelledCount += 1;
        break;
      default:
        break;
    }
  });

  return summary;
};

const attachRefundSummary = async (transactions) => {
  if (!transactions.length) {
    return transactions;
  }

  const transactionIds = transactions
    .map((transaction) => transaction.transactionId)
    .filter(Boolean);

  if (!transactionIds.length) {
    return transactions;
  }

  const refunds = await Refund.find({
    transactionId: { $in: transactionIds },
  })
    .select("transactionId status amount createdAt")
    .lean();

  const refundsByTransactionId = refunds.reduce((accumulator, refund) => {
    const current = accumulator.get(refund.transactionId) || [];
    current.push(refund);
    accumulator.set(refund.transactionId, current);
    return accumulator;
  }, new Map());

  return transactions.map((transaction) => {
    const relatedRefunds =
      refundsByTransactionId.get(transaction.transactionId) || [];

    // Calculate days elapsed since transaction creation
    const createdTime = new Date(transaction.createdAt).getTime();
    const currentTime = new Date().getTime();
    const diffDays = (currentTime - createdTime) / (1000 * 60 * 60 * 24);
    const hasRefundRequest = relatedRefunds.length > 0;
    const isSuccessful =
      transaction.status === "Successful" || transaction.status === "Completed";
    
      // 7-day rule check
    const isRefundable = isSuccessful && !hasRefundRequest && diffDays <= 7;

    return {
      ...transaction,
      refundSummary: {
        hasRefundRequest: relatedRefunds.length > 0,
        refundCount: relatedRefunds.length,
        latestRefundStatus:
          relatedRefunds.length > 0
            ? relatedRefunds[relatedRefunds.length - 1].status
            : null,
      },
    };
  });
};

export const getTransactions = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || DEFAULT_PAGE, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1);
    const query = buildQuery(req.query);

    const [transactions, total, allMatchingTransactions] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(query),
      Transaction.find(query).select("amount status").lean(),
    ]);

    const transactionsWithRefunds = await attachRefundSummary(transactions);

    return res.json({
      transactions: transactionsWithRefunds,
      total,
      currentPage: page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      pageSize: limit,
      merchantName: SINGLE_SHOP_MERCHANT,
      summary: buildSummary(allMatchingTransactions, total),
    });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return res.status(500).json({ message: "Failed to fetch transactions" });
  }
};

export const getTransactionById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    const transaction = await Transaction.findById(req.params.id).lean();

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const [transactionWithRefunds] = await attachRefundSummary([transaction]);

    return res.json(transactionWithRefunds);
  } catch (error) {
    console.error("Failed to fetch transaction:", error);
    return res.status(500).json({ message: "Failed to fetch transaction" });
  }
};

export const getTransactionHistory = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    const transaction = await Transaction.findById(req.params.id)
      .select("transactionId merchantName status lifecycleHistory")
      .lean();

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    return res.json({
      transactionId: transaction.transactionId,
      merchantName: transaction.merchantName,
      currentStatus: transaction.status,
      lifecycleHistory: transaction.lifecycleHistory || [],
    });
  } catch (error) {
    console.error("Failed to fetch transaction history:", error);
    return res.status(500).json({ message: "Failed to fetch transaction history" });
  }
};

export const createTransaction = async (req, res) => {
  try {
    const payload = normalizeTransaction(req.body);

    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than zero" });
    }

    if (!isValidStatus(payload.status)) {
      return res.status(400).json({ message: "Invalid transaction status" });
    }

    const existingTransaction = await Transaction.findOne({ transactionId: payload.transactionId });
    if (existingTransaction) {
      return res.status(400).json({ message: "Transaction ID already exists" });
    }

    const transaction = await Transaction.create({
      ...payload,
      amount,
      lifecycleHistory: [
        {
          status: payload.status,
          previousStatus: null,
          changedAt: new Date(),
          reason: "Initial transaction record created",
        },
      ],
    });

    const [transactionWithRefunds] = await attachRefundSummary([
      transaction.toObject(),
    ]);

    return res.status(201).json(transactionWithRefunds);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Transaction ID already exists" });
    }

    console.error("Failed to create transaction:", error);
    return res.status(500).json({ message: "Failed to create transaction" });
  }
};

export const updateTransactionStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;

    if (!isValidStatus(status)) {
      return res.status(400).json({ message: "Invalid transaction status" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (transaction.status === status) {
      return res.status(400).json({ message: "Transaction already has this status" });
    }

    const allowedNextStatuses =
      ALLOWED_STATUS_TRANSITIONS[transaction.status] || [];

    if (!allowedNextStatuses.includes(status)) {
      return res.status(409).json({
        message: `Invalid transaction status transition from ${transaction.status} to ${status}`,
        allowedNextStatuses,
      });
    }

    const previousStatus = transaction.status;
    transaction.status = status;
    transaction.lifecycleHistory.push({
      status,
      previousStatus,
      changedAt: new Date(),
      reason: (reason || "").trim() || `Status changed from ${previousStatus} to ${status}`,
    });

    const updatedTransaction = await transaction.save();

    const [transactionWithRefunds] = await attachRefundSummary([
      updatedTransaction.toObject(),
    ]);

    return res.json(transactionWithRefunds);
  } catch (error) {
    console.error("Failed to update transaction status:", error);
    return res.status(500).json({ message: "Failed to update transaction status" });
  }
};

export const exportTransactions = async (req, res) => {
  try {
    const query = buildQuery(req.query);
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const csv = buildCsv(transactions);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="transactions.csv"');
    return res.send(csv);
  } catch (error) {
    console.error("Failed to export transactions:", error);
    return res.status(500).json({ message: "Failed to export transactions" });
  }
};
