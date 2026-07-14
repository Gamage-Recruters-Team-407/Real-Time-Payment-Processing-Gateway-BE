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

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    password: {
      type: String,
      minlength: 6,
      select: false,
      required: function requiredPassword() {
        return !this.googleId;
      },
    },

    // Optional — supports Google OAuth login (no password set in that case)
    googleId: {
      type: String,
      default: null,
    },

    // Matches the Admin Page / User Page split used across the app
    // (Sidebar role="admin"|"user", Navbar role="admin"|"user")
    role: {
      type: String,
      enum: ["Admin", "User"],
      default: "User",
    },

    // Shown as the small subtitle under the user's name in the Navbar
    // (e.g. "Compliance access") — optional, admin-assignable label
    accessLabel: {
      type: String,
      trim: true,
      default: "Standard access",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);