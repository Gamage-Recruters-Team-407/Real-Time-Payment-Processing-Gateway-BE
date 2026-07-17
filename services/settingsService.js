import User from "../models/User.js";
import LoginActivity from "../models/LoginActivity.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { getEmailConfig } from "../config/otp.js";
import { generateResetToken } from "../config/jwt.js";

const createTransporter = () => {
  const EMAIL_CONFIG = getEmailConfig();
  return nodemailer.createTransport({
    host: EMAIL_CONFIG.HOST,
    port: EMAIL_CONFIG.PORT,
    secure: false,
    auth: {
      user: EMAIL_CONFIG.USER,
      pass: EMAIL_CONFIG.PASS,
    },
  });
};

export const getSettings = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const activities = await LoginActivity.find({ userId })
    .sort({ createdAt: -1 })
    .limit(5);

  return {
    loginAlertsEnabled: user.loginAlertsEnabled ?? false,
    rememberDeviceEnabled: user.rememberDeviceEnabled ?? true,
    recoveryEmail: user.recoveryEmail || user.email,
    activities: activities.map(act => ({
      activity: act.activity,
      device: act.device,
      timestamp: act.createdAt,
      status: act.status
    }))
  };
};

export const updateSettings = async (userId, updateData) => {
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        loginAlertsEnabled: updateData.loginAlertsEnabled,
        rememberDeviceEnabled: updateData.rememberDeviceEnabled,
        recoveryEmail: updateData.recoveryEmail
      }
    },
    { new: true }
  );

  await logActivity(userId, "Settings Updated", "System", "Success");
  return updatedUser;
};

export const updatePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select("+password");
  if (!user) throw new Error("User not found");

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    await logActivity(userId, "Failed Password Change", "System", "Warning");
    throw new Error("Incorrect current password");
  }

  user.password = newPassword;
  await user.save();

  await logActivity(userId, "Password Changed", "System", "Success");
  return { message: "Password updated successfully" };
};

export const logActivity = async (userId, activity, device, status, ip = "") => {
  return await LoginActivity.create({
    userId,
    activity,
    device,
    status,
    ip
  });
};

export const sendResetLink = async (recoveryEmail) => {
  const user = await User.findOne({ email: recoveryEmail });
  if (!user) throw new Error("Recovery email not found in our records.");

  const resetToken = generateResetToken(user._id);
  const EMAIL_CONFIG = getEmailConfig();
  
  if (!EMAIL_CONFIG.USER || !EMAIL_CONFIG.PASS) {
    console.log(`\n[TESTING MODE] Password Reset Link: http://localhost:5173/reset-password?token=${resetToken}\n`);
    return { message: `A secure reset link has been sent to ${recoveryEmail}` };
  }

  const transporter = createTransporter();
  const mailOptions = {
    from: `"Gamage Pay Support" <${EMAIL_CONFIG.USER}>`,
    to: recoveryEmail,
    subject: "Password Reset Request - Gamage Pay",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 25px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 500px; margin: 0 auto; color: #0A192F;">
        <h2 style="color: #0A192F; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-top: 0;">Password Reset</h2>
        <p>Hello ${user.name || "User"},</p>
        <p>A request has been made to reset the password for your Gamage Pay account.</p>
        <div style="margin: 25px 0; text-align: center;">
          <a href="http://localhost:5173/reset-password?token=${resetToken}" style="background-color: #10B981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #64748B; font-size: 12px; line-height: 1.5;">If you did not request this, you can safely ignore this security email. Your password will remain unchanged.</p>
      </div>
    `,
  };

  try {
    console.log(`📧 Sending real password reset email to ${recoveryEmail}...`);
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent successfully!`);
    return { message: `A secure reset link has been sent to ${recoveryEmail}` };
  } catch (error) {
    console.error("❌ Failed to send reset email:", error.message);
    throw new Error("Failed to dispatch reset email. Please try again later.");
  }
};

export const sendLoginAlertEmail = async (user, device, ip) => {
  const EMAIL_CONFIG = getEmailConfig();
  if (!EMAIL_CONFIG.USER || !EMAIL_CONFIG.PASS) {
    console.log(`\n[TESTING MODE] Login Alert Email sent to: ${user.email}\n`);
    return;
  }

  const transporter = createTransporter();
  const mailOptions = {
    from: `"Gamage Pay Security" <${EMAIL_CONFIG.USER}>`,
    to: user.email,
    subject: "Security Alert: New Login Detected - Gamage Pay",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 25px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 500px; margin: 0 auto; color: #0A192F;">
        <h2 style="color: #E11D48; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-top: 0;">New Login Detected</h2>
        <p>Hello ${user.name || "User"},</p>
        <p>We detected a new login access to your Gamage Pay merchant account.</p>
        <div style="background-color: #F8FAFC; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; margin: 20px 0; font-size: 13px;">
          <p style="margin: 4px 0;"><strong>Device/Browser:</strong> ${device}</p>
          <p style="margin: 4px 0;"><strong>IP Address:</strong> ${ip}</p>
          <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p style="color: #64748B; font-size: 12px; line-height: 1.5;">If this was you, no action is needed. If you do not recognize this login activity, please reset your password immediately.</p>
      </div>
    `,
  };

  try {
    console.log(`📧 Sending login warning alert email to ${user.email}...`);
    await transporter.sendMail(mailOptions);
    console.log(`✅ Login warning email sent successfully.`);
  } catch (error) {
    console.error("❌ Failed to send login alert email:", error.message);
  }
};
