import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
    {
        paymentId: {
            type: String,
            ref: "Payment",
        },

        userId: {
            type: String,
            ref: "User",
        },

        amount: {
            type: String,
        },

        transactionType: {
            type: String,
            enum: ["Credit", "Debit"],
        },

        status: {
            type: String,
            enum: ["Pending", "Completed", "Failed"],
        },

        referenceNo: {
            type: String,
        },

        createdAt: {
            type: Date,
            default: Date.now,
        }
    }
);

export default mongoose.model("Transaction", transactionSchema);