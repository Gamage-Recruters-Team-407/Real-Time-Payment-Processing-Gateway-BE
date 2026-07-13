import mongoose from "mongoose";

const transactionStatuses = ["Pending", "Processing", "Successful", "Failed", "Cancelled"];

const lifecycleHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: transactionStatuses,
      required: true,
    },
    previousStatus: {
      type: String,
      default: null,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: [true, "Transaction ID is required"],
      unique: true,
      trim: true,
    },
    merchantName: {
      type: String,
      required: [true, "Merchant name is required"],
      trim: true,
    },
    customerName: {
      type: String,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than zero"],
    },
    currency: {
      type: String,
      trim: true,
      default: "USD",
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: "Unknown",
    },
    status: {
      type: String,
      enum: transactionStatuses,
      default: "Pending",
      required: true,
    },
    paymentReference: {
      type: String,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lifecycleHistory: {
      type: [lifecycleHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ transactionId: 1 }, { unique: true });
transactionSchema.index({ merchantName: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });

export const TRANSACTION_STATUSES = transactionStatuses;

export default mongoose.model("Transaction", transactionSchema);
