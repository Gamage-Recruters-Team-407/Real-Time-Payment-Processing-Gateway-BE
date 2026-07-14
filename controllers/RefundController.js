import Refund from "../models/Refund.js";

export const createRefund = async (req, res) => {
  try {
    const { name, transactionId, phone, reason, itemPhoto } = req.body;

    if (!name || !transactionId || !phone || !reason || !itemPhoto) {
      return res.status(400).json({
        success: false,
        message: "All fields including item photo are required.",
      });
    }

    const refund = await Refund.create({
      name: String(name).trim(),
      transactionId: String(transactionId).trim(),
      phone: String(phone).trim(),
      reason: String(reason).trim(),
      itemPhoto, // Base64 image data URL
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
