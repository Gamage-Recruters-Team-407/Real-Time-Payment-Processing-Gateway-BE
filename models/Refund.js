import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
 
    // Human readable ID
    refundId: {
      type: String,
      unique: true,
      required: true,
    },

    
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    transactionId: {
      type: String,
      required: [true, "Transaction ID is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },

     amount: {
      type: Number,
      required: true,
      min: 0,
    },
    
    reason: {
      type: String,
      required: [true, "Reason for refund is required"],
      trim: true,
    },
    itemPhoto: {
      type: String,
      required: [true, "Item photo is required"],
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    approvedDate: {
        type: Date,
    },

    refundedDate: {
  type: Date,
},


  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Refund", refundSchema);
