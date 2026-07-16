import Payment from "../models/Payment.js";
import Refund from "../models/Refund.js";

const REFUND_WINDOW_DAYS = 7;

const attachRefundSummary = async (payments) => {
  if (!payments.length) return payments;
  const paymentIds = payments.map((p) => p.paymentId).filter(Boolean);
  if (!paymentIds.length) return payments;

  const refunds = await Refund.find({
    transactionId: { $in: paymentIds },
  }).lean();

  const refundsByPaymentId = refunds.reduce((acc, refund) => {
    const current = acc.get(refund.transactionId) || [];
    current.push(refund);
    acc.set(refund.transactionId, current);
    return acc;
  }, new Map());

  return payments.map((p) => {
    const relatedRefunds = refundsByPaymentId.get(p.paymentId) || [];
    const createdTime = new Date(p.createdAt).getTime();
    const currentTime = Date.now();
    const diffDays = (currentTime - createdTime) / (1000 * 60 * 60 * 24);
    const hasRefundRequest = relatedRefunds.length > 0;
    const isRefundable = p.status === "COMPLETED" && !hasRefundRequest && diffDays <= REFUND_WINDOW_DAYS;

    return {
      ...p,
      refundSummary: {
        hasRefundRequest,
        refundCount: relatedRefunds.length,
        latestRefundStatus: hasRefundRequest ? relatedRefunds[relatedRefunds.length - 1].status : null,
        isRefundable,
      },
    };
  });
};

export const getPaymentHistory = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 5, 1);
    
    const query = {};
    if (req.user?._id) {
      query.userId = req.user._id;
    }

    const search = (req.query.search || "").trim();
    if (search) {
      query.$or = [
        { paymentId: { $regex: search, $options: "i" } },
        { transactionId: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const status = (req.query.status || "").trim();
    if (status && status !== "All") {
      if (status.toUpperCase() === "SUCCESSFUL" || status.toUpperCase() === "COMPLETED") {
        query.status = "COMPLETED";
      } else {
        query.status = status.toUpperCase();
      }
    }

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query),
    ]);

    const paymentsWithRefunds = await attachRefundSummary(payments);

    const results = paymentsWithRefunds.map((p) => ({
      _id: p._id,
      transactionId: p.transactionId || p.paymentId,
      dateTime: p.createdAt,
      createdAt: p.createdAt,
      method: p.paymentMethod + (p.cardLastFourDigits ? ` •••• ${p.cardLastFourDigits}` : ""),
      amount: p.amount,
      currency: p.currency,
      status: p.status === "COMPLETED" ? "Successful" : p.status.charAt(0) + p.status.slice(1).toLowerCase(),
      refundSummary: p.refundSummary,
    }));

    return res.json({
      success: true,
      data: {
        transactions: results,
        results,
        total,
        currentPage: page,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        pageSize: limit,
      }
    });
  } catch (error) {
    console.error("Fetch payment history error:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve payment history" });
  }
};

export const getPaymentSummary = async (req, res) => {
  try {
    const query = {};
    if (req.user?._id) {
      query.userId = req.user._id;
    }

    const [all, successful, failed, flagged] = await Promise.all([
      Payment.find(query).select("amount status").lean(),
      Payment.countDocuments({ ...query, status: "COMPLETED" }),
      Payment.countDocuments({ ...query, status: "FAILED" }),
      Payment.countDocuments({ ...query, status: "PROCESSING" }),
    ]);

    const totalVolume = all
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const totalCount = all.length;
    const successRatePct =
      totalCount > 0 ? ((successful / totalCount) * 100).toFixed(1) : "0.0";

    return res.json({
      success: true,
      data: {
        totalVolume,
        successfulCount: successful,
        failedCount: failed,
        flaggedCount: flagged,
        successRatePct: parseFloat(successRatePct),
        totalVolumeChangePct: 0.0,
      }
    });
  } catch (error) {
    console.error("Fetch payment summary error:", error);
    return res.status(500).json({ success: false, message: "Unable to retrieve payment summary" });
  }
};
