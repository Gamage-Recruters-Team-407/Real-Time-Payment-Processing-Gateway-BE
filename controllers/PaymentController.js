import { randomUUID } from "crypto";
import Payment from "../models/Payment.js";

const PRIMARY_DESTINATION_ACCOUNT = "PRIMARY_BANK_ACCOUNT";

const generatePaymentId = () => {
  return `PAY-${Date.now()}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
};

export const createPayment = async (req, res) => {
  try {
    const {
      amount,
      currency = "LKR",
      description = "",
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

    const payment = await Payment.create({
      paymentId: generatePaymentId(),

      userId: req.user?._id ?? null,

      amount: Number(numericAmount.toFixed(2)),

      currency: normalizedCurrency,

      description: String(description).trim(),

      status: "PENDING",

      destinationAccountKey: PRIMARY_DESTINATION_ACCOUNT,
    });

    return res.status(201).json({
      success: true,
      message: "Payment initiated successfully",
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

export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      paymentId: req.params.paymentId,
    });

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