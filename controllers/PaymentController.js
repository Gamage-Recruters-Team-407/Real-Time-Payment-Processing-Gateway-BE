import { randomUUID } from "crypto";
import mongoose from "mongoose";
import {
  processCardPayment,
  createPendingPayment,
  findPaymentById,
  findPaymentByObjectId,
  findAllPayments,
  updatePaymentStatusInService
} from "../services/paymentService.js";
import { fraudService } from "../services/fraudService.js";

const PRIMARY_DESTINATION_ACCOUNT = "PRIMARY_BANK_ACCOUNT";

const ALLOWED_STATUS_TRANSITIONS = {
  PENDING: ["PROCESSING", "COMPLETED", "FAILED", "CANCELLED"],
  PROCESSING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

const generatePaymentId = () => {
  return `PAY-${Date.now()}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
};

// Create a new payment
export const createPayment = async (req, res) => {
  try {
    const {
      amount,
      currency = "LKR",
      description = "",
      paymentMethod = "CARD",
      cardDetails,
      deviceId,
      ipAddress,
    } = req.body;

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a valid number greater than 0",
      });
    }

    const normalizedCurrency = String(currency)
      .trim()
      .toUpperCase();

    if (normalizedCurrency !== "LKR") {
      return res.status(400).json({
        success: false,
        message: "Only LKR currency is currently supported",
      });
    }

    const normalizedPaymentMethod = String(paymentMethod)
      .trim()
      .toUpperCase();

    if (normalizedPaymentMethod !== "CARD") {
      return res.status(400).json({
        success: false,
        message: "Only CARD payment method is currently available",
      });
    }

    let payment;

    if (cardDetails) {
      const paymentId = generatePaymentId();
      const result = await processCardPayment({
        userId: req.user?._id || req.user?.id || null,
        customerEmail: req.user?.email || "",
        customerName: cardDetails.cardholderName || "",
        amount: numericAmount,
        paymentId,
        description: String(description).trim(),
        cardDetails: {
          cardholderName: cardDetails.cardholderName,
          cardNumber: cardDetails.cardNumber,
          expiry: cardDetails.expiry || "12/29",
          cvc: cardDetails.cvc || "123"
        }
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message || "Payment processing failed",
          errors: result.errors
        });
      }

      payment = result.payment;
    } else {
      payment = await createPendingPayment({
        paymentId: generatePaymentId(),
        userId: req.user?._id || req.user?.id || null,
        customerEmail: req.user?.email || "",
        amount: Number(numericAmount.toFixed(2)),
        currency: normalizedCurrency,
        description: String(description).trim(),
        paymentMethod: normalizedPaymentMethod,
        customerName: req.user?.email || "Payment Customer",
        destinationAccountKey: PRIMARY_DESTINATION_ACCOUNT,
      });
    }

      // INTEGRATE WITH FRAUD SYSTEM
      try {
        const userId = req.user?._id || req.user?.id || "USER-DEFAULT";
        // The merchant name is not explicitly passed by standard payment, so we use description or a generic name.
        const merchantName = description ? description : "System Merchant";
        
        const fraudResult = await fraudService.processTransaction({
          transactionId: payment.transactionId || payment.paymentId,
          userId: userId.toString(),
          amount: numericAmount,
          merchant: merchantName,
          ip: ipAddress || req.ip || "Unknown",
          deviceId: deviceId || "Unknown"
        });

        // ENFORCE FRAUD BLOCK
        if (fraudResult && fraudResult.status === 'BLOCKED') {
          await updatePaymentStatusInService(payment.paymentId, { status: "FAILED" });
          return res.status(403).json({
            success: false,
            message: "Transaction blocked by fraud engine due to high risk.",
            fraudStatus: "BLOCKED"
          });
        }
      } catch (fraudErr) {
        console.error("Failed to process transaction through Fraud System:", fraudErr);
      }

    return res.status(201).json({
      success: true,
      message: cardDetails ? "Payment processed successfully" : "Payment initiated successfully",
      data: payment,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate payment ID detected. Please try again.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)
          .map((item) => item.message)
          .join(", "),
      });
    }

    console.error("Create payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to initiate payment",
    });
  }
};

// Get a payment by payment ID
export const getPaymentById = async (req, res) => {
  try {
    const payment = await findPaymentById(req.params.paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Get payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve payment",
    });
  }
};

// Update payment status
export const updatePaymentStatus = async (req, res) => {
  try {
    const { status, transactionId, cardLastFourDigits } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Payment status is required",
      });
    }

    const normalizedStatus = String(status)
      .trim()
      .toUpperCase();

    const validStatuses = Object.keys(ALLOWED_STATUS_TRANSITIONS);

    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment status. Allowed statuses: ${validStatuses.join(", ")}`,
      });
    }

    const payment = await findPaymentById(req.params.paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const currentStatus = payment.status;

    // Allow repeated same-status requests safely
    if (currentStatus === normalizedStatus) {
      return res.status(200).json({
        success: true,
        message: `Payment is already in ${normalizedStatus} status`,
        data: payment,
      });
    }

    const allowedNextStatuses =
      ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedNextStatuses.includes(normalizedStatus)) {
      return res.status(409).json({
        success: false,
        message: `Invalid status transition from ${currentStatus} to ${normalizedStatus}`,
        allowedNextStatuses,
      });
    }

    const updatedPayment = await updatePaymentStatusInService(req.params.paymentId, {
      status: normalizedStatus,
      transactionId: transactionId ? String(transactionId).trim() : undefined,
      cardLastFourDigits: cardLastFourDigits ? String(cardLastFourDigits).trim() : undefined
    });

    return res.status(200).json({
      success: true,
      message: `Payment status updated from ${currentStatus} to ${normalizedStatus}`,
      data: updatedPayment,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)
          .map((item) => item.message)
          .join(", "),
      });
    }

    console.error("Update payment status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update payment status",
    });
  }
};

// Get all payments for admin
export const getAllPayments = async (req, res) => {
  try {
    const payments = await findAllPayments();

    return res.status(200).json({
      success: true,
      message: "Payments retrieved successfully",
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error("Get all payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve payments",
    });
  }
};

// Get payment by MongoDB Object ID
export const getPaymentByObjectId = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB Object ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment object ID",
      });
    }

    const payment = await findPaymentByObjectId(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment retrieved successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Get payment by object ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve payment",
    });
  }
};
