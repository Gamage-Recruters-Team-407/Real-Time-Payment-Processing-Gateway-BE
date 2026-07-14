import Refund from "../models/Refund.js";

export const getAllRefunds = async () => {
  return await Refund.find().sort({ createdAt: -1 });
};

export const getRefundById = async (id) => {
  return await Refund.findById(id);
};

export const updateRefundStatus = async (id, status) => {
  const updateData = { status };

  if (status === "REFUNDED") {
    updateData.refundedDate = new Date();
  }

  return await Refund.findByIdAndUpdate(id, updateData, {
    new: true,
  });
};

export const deleteRefund = async (id) => {
  return await Refund.findByIdAndDelete(id);
};