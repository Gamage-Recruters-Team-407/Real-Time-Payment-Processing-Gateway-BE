import User from "../models/User.js";
import { generateToken } from "../config/jwt.js";
import { logActivity } from "../services/settingsService.js";


//    Register new user

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, adminSecret } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const role =
      adminSecret && adminSecret === process.env.ADMIN_SECRET_KEY
        ? "admin"
        : "user";

    const user = await User.create({ name, email, password, role });
    const token = generateToken(user._id, user.role);

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

//     Login user
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

    // Extract client IP address supporting proxy headers
    const clientIp = 
      req.headers["x-forwarded-for"]?.split(',')[0].trim() || 
      req.ip || 
      req.socket.remoteAddress || 
      "127.0.0.1";

    // [RESTORED] Device Detection from User Agent header
    const userAgent = req.headers["user-agent"] || "Unknown Device";
    const rawDevice = userAgent.includes("Chrome")
      ? "Chrome"
      : userAgent.includes("Firefox")
      ? "Firefox"
      : userAgent.includes("Safari")
      ? "Safari"
      : "System";

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Log incorrect password attempt
      await logActivity(user._id, "Failed Login Attempt", rawDevice, "Warning", clientIp);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // [RESTORED] Remember Device check: set token expiry to 30 days if enabled
    const token = generateToken(
      user._id,
      user.role,
      user.rememberDeviceEnabled ? "30d" : undefined
    );

    // Check if this device logged in previously for this user with this IP
    const LoginActivity = (await import("../models/LoginActivity.js")).default;
    const knownDevice = await LoginActivity.findOne({
      userId: user._id,
      device: rawDevice,
      ip: clientIp,
    });

    if (!knownDevice) {
      // New device login alerts check
      if (user.loginAlertsEnabled) {
        const { sendLoginAlertEmail } = await import("../services/settingsService.js");
        sendLoginAlertEmail(user, rawDevice, clientIp);
      }
      await logActivity(user._id, "New Login Detected", rawDevice, "Warning", clientIp);
    } else {
      await logActivity(user._id, "Login Successful", rawDevice, "Success", clientIp);
    }

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        loginAlertsEnabled: user.loginAlertsEnabled,
        rememberDeviceEnabled: user.rememberDeviceEnabled
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

//     Get logged-in user profile

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

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (user) {
     
      console.log(`[TODO] Send OTP to ${user.email} - waiting on Dev 5's otpService`);
    }

    return res.status(200).json({
      message: "If an account exists with this email, a reset code has been sent.",
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};