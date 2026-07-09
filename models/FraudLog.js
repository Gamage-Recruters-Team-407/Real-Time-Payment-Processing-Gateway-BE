import mongoose from "mongoose";

const fraudLogSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            ref: "User",
        },

        transactionId: {
            type: String,
            ref: "Transaction",
        },

        fraudType: {
            type: String,
            enum: ["Suspicious", "Unusual", "Potential Fraud"],
        },

        description: {
            type: String,
        },

        createdAt: {
            type: Date,
            default: Date.now,
        }
    }
);

export default mongoose.model("FraudLog", fraudLogSchema);