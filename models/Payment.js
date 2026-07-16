import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: [true, "Payment ID is required"],
      unique: true,
      index: true,
      trim: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },

    currency: {
      type: String,
      enum: ["LKR"],
      default: "LKR",
      uppercase: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [255, "Description cannot exceed 255 characters"],
      default: "",
    },

    paymentMethod: {
      type: String,
      enum: ["CARD"],
      default: "CARD"
    },

    cardLastFourDigits: {
      type: String,
      default: null,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
      ],
      default: "PENDING",
      index: true,
    },

    destinationAccountKey: {
      type: String,
      default: "PRIMARY_BANK_ACCOUNT",
      immutable: true,
    },

    transactionId: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model("Payment", paymentSchema);