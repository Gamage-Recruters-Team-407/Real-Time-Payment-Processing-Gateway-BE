import User from "../models/User.js";
import { generateToken, verifyResetToken } from "../config/jwt.js";
import { logActivity } from "../services/settingsService.js";

// @desc    Register new user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id, user.role, user.rememberDeviceEnabled ? "30d" : undefined);

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id, user.role, user.rememberDeviceEnabled ? "30d" : undefined);

    // Detect device name from user-agent header
    const userAgent = req.headers["user-agent"] || "Unknown Device";
    const rawDevice = userAgent.includes("Chrome") ? "Chrome" : userAgent.includes("Firefox") ? "Firefox" : userAgent.includes("Safari") ? "Safari" : "System";
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

    // Query database to check if this device was logged in previously by this user
    const LoginActivity = (await import("../models/LoginActivity.js")).default;
    const knownDevice = await LoginActivity.findOne({ userId: user._id, device: rawDevice });

    if (!knownDevice) {
      // It's a new device!
      // 1. If Login Alerts are enabled, send warning email
      if (user.loginAlertsEnabled) {
        const { sendLoginAlertEmail } = await import("../services/settingsService.js");
        sendLoginAlertEmail(user, rawDevice, clientIp);
      }
      // 2. Log activity as a Warning event in the table
      await logActivity(user._id, "New Login Detected", rawDevice, "Warning");
    } else {
      // Log standard login success activity
      await logActivity(user._id, "Login Successful", rawDevice, "Success");
    }

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get logged-in user profile
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user });
  } catch (error) {
    console.error("GET ME ERROR:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Verify reset token and update user password
// @route   POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required." });
    }

    let decoded;
    try {
      decoded = verifyResetToken(token);
    } catch (err) {
      return res.status(400).json({ message: "Reset token is invalid or has expired." });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Set new password (triggers schema pre-save salting and hashing)
    user.password = newPassword;
    await user.save();

    // Log the security activity
    await logActivity(user._id, "Password Reset", "System", "Success");

    return res.status(200).json({ message: "Password updated successfully. You can now login." });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};