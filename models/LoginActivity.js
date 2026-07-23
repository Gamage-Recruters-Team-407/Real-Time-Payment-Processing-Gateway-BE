import mongoose from "mongoose";

const loginActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    activity: {
      type: String,
      required: true,
    },
    device: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Success", "Warning"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("LoginActivity", loginActivitySchema);
