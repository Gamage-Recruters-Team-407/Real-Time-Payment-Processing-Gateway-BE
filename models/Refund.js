import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
    {
        refundId: {
            type: String,
            unique: true,
            required: true,
        },

        name: {
            type: String,
            required: true,
        },

        transactionId: {
            type: String,
            required: true,
        },

        phone: {
            type: String,
            required: true,
        },

        amount: {
            type: Number,
            required: true,
        },

        reason: {
            type: String,
            required: true,
        },

        itemPhoto: {
            type: String,
            required: true,
        },

        status: {
            type: String,
            enum: [
                "PENDING",
                "APPROVED",
                "REJECTED",
                "REFUNDED",
            ],
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