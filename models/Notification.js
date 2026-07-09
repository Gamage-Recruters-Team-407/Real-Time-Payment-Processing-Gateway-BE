import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            ref: "User",
        },

        title: {
            type: String,
        },

        message: {
            type: String,
            required: [true, "Message is required"],
        },

        type: {
            type: String,
            enum: ["Info", "Warning", "Error"],
            default: "Info",
        },
        
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);


export default mongoose.model("Notification", notificationSchema);