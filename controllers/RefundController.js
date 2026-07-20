import Refund from "../models/Refund.js";
import Transaction from "../models/Transaction.js";
import * as refundService from "../services/refundService.js";

const generateRefundId = () => {

  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const random = Math.floor(1000 + Math.random() * 9000);

  return `REF-${year}${month}${day}-${random}`;
};



export const createRefund = async (req, res) => {
  try {
    let { name, transactionId, phone, amount, reason, itemPhoto } = req.body;

    if ((amount === undefined || amount === null) && transactionId) {
      const txn = await Transaction.findOne({ transactionId: String(transactionId).trim() });
      amount = txn ? txn.amount : 0.0;
    }

    if (!name || !transactionId || !phone || amount === undefined || amount === null || !reason || !itemPhoto) {
      return res.status(400).json({
        success: false,
        message: "All fields including item photo and amount are required.",
      });
    }

    const refund = await Refund.create({
      refundId: generateRefundId(),
      name: String(name).trim(),
      transactionId: String(transactionId).trim(),
      phone: String(phone).trim(),
      reason: String(reason).trim(),
      itemPhoto, // Base64 image data URL
      amount: Number(amount),
    });

    return res.status(201).json({
      success: true,
      message: "Refund request submitted successfully",
      data: refund,
    });
  } catch (error) {
    console.error("Create refund error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to submit refund request",
      error: error.message,
    });
  }
};

export const getAllRefunds = async (req, res) => {
  try {
    const refunds = await refundService.getAllRefunds();

    res.status(200).json(refunds);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRefundById = async (req, res) => {
  try {
    const refund = await refundService.getRefundById(req.params.id);

    if (!refund) {
      return res.status(404).json({
        message: "Refund not found",
      });
    }

    res.status(200).json(refund);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const approveRefund = async (req, res) => {
  try {

    const refund = await Refund.findByIdAndUpdate(
      req.params.id,
      {
        status: "APPROVED",
        approvedDate: new Date(),
      },
      { new: true }
    );

    res.status(200).json(refund);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};

export const rejectRefund = async (req, res) => {
  try {

    const refund = await Refund.findByIdAndUpdate(
      req.params.id,
      {
        status: "REJECTED",
        approvedDate: null,
      },
      { new: true }
    );

    res.status(200).json(refund);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};

export const refundPayment = async (req, res) => {
  try {

    const refund = await Refund.findByIdAndUpdate(
      req.params.id,
      {
        status: "REFUNDED",
        refundedDate: new Date(),
      },
      { new: true }
    );

    res.status(200).json(refund);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};

export const deleteRefund = async (req, res) => {
  try {
    await refundService.deleteRefund(req.params.id);

    res.status(200).json({
      message: "Refund deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


