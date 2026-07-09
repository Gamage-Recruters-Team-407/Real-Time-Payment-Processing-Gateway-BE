import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
        type: String,
        ref: "User",
        required: [true, "User ID is required"],
    },

    amount: {
      type: String,
      required: [true, "Amount is required"],
    },

    paymentMethod: {
      type: String,
      enum: ["Credit Card", "PayPal"], 
    },

    cardLastFourDigits: {
        type: String,
    },
    
    status: {
      type: String,
      enum: ["Pending", "Completed", "Failed"],
      default: "Pending",
    },

    transactionId: {
      type: String,
      required: [true, "Transaction ID is required"],
    },

    createdAt: {
      type: Date,
      default: Date.now,
    }
    
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Payment", paymentSchema);