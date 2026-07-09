import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      minlength: 6,
      select: false,
      required: function requiredPassword() {
        return !this.googleId;
      },
    },

    role: {
      type: String,
      enum: ["Admin", "HR", "Manager", "Employee"],
      default: "Employee",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);