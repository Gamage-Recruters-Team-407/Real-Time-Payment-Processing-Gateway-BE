import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            ref: "User",
            required: [true, "User ID is required"],
        },

        title: {
            type: String,
            required: [true, "Title is required"],
        },

        message: {
            type: String,
            required: [true, "Message is required"],
        },

        // Matches the categories used by the frontend NotificationCard component
        type: {
            type: String,
            enum: [
                "payment_success",
                "payment_failed",
                "settlement",
                "security",
                "otp",
                "system",
            ],
            default: "system",
        },

        read: {
            type: Boolean,
            default: false,
        },

        // Optional label shown on the frontend, e.g. "View receipt", "Resolve exception"
        actionLabel: {
            type: String,
        },

        // Optional deep link the frontend can route to when the card is clicked
        link: {
            type: String,
        },
    },
    {
        timestamps: true, // gives us createdAt / updatedAt automatically
    }
);

export default mongoose.model("Notification", notificationSchema);