import * as settingsService from "../services/settingsService.js";
import User from "../models/User.js";


export const getSettings = async (req, res) => {
  try {
    const settings = await settingsService.getSettings(req.user.id);
    res.status(200).json(settings);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    await settingsService.updateSettings(req.user.id, req.body);
    res.status(200).json({ message: "Settings updated successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await settingsService.updatePassword(req.user.id, currentPassword, newPassword);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const sendResetLink = async (req, res) => {
  try {
    const { recoveryEmail } = req.body;
    const result = await settingsService.sendResetLink(recoveryEmail);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    let user;

    if (token) {
      // Token-based password reset (from the settings page link)
      const { verifyResetToken } = await import("../config/jwt.js");
      try {
        const decoded = verifyResetToken(token);
        user = await User.findById(decoded.id);
      } catch (err) {
        return res.status(400).json({ message: "Reset token is invalid or has expired." });
      }
    } else if (email) {
      // OTP-based/email password reset
      user = await User.findOne({ email });
    } else {
      return res.status(400).json({ message: "Either email or token is required" });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    await user.save({ validateModifiedOnly: true });

    // Log Password Reset Activity via settingsService
    await settingsService.logActivity(user._id, "Password Reset", "System", "Success");

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
