import { generateRandomOTP, getExpiryDate } from "../utils/generateOTP.js";
import { saveOTP, getOTP, updateAttempts, deleteOTP } from "../utils/otpStore.js";
import { OTP_CONFIG, getEmailConfig } from "../config/otp.js";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import { createNotification } from "./notificationService.js";

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

const sendOTPEmail = async (email, otp) => {
    const EMAIL_CONFIG = getEmailConfig();

    if (!EMAIL_CONFIG.USER || !EMAIL_CONFIG.PASS) {
        console.log(`\n[TESTING MODE] OTP for ${email} is: ${otp}\n`);
        return;
    }

    const transporter = createTransporter();

    const mailOptions = {
        from: `"GamagePay" <${EMAIL_CONFIG.USER}>`,
        to: email,
        subject: "Your OTP Verification Code",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <h2>OTP Verification</h2>
                <p>Your OTP code is: <b style="font-size: 24px; color: #007bff;">${otp}</b></p>
                <p>This code will expire in ${OTP_CONFIG.EXPIRY_MINUTES} minutes.</p>
            </div>
        `,
    };

    try {
        console.log(`📧 Sending OTP email to ${email}...`);
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully!`);
    } catch (error) {
        console.error(`❌ Failed to send email:`, error.message);
        throw new Error("Failed to send OTP email.");
    }
};

/**
 * Notifies the user that their payment did not complete because OTP
 * verification wasn't finished — whether they entered the wrong code too
 * many times, took too long, or simply closed the app without trying.
 */
function notifyPaymentIncomplete(userId, reason) {
    createNotification({
        userId,
        type: "payment_failed",
        title: "Payment incomplete",
        message: `Your payment could not be completed — ${reason}`,
    }).catch((err) => console.error("Failed to create payment_incomplete notification:", err.message));
}

// 1. OTP Generation (works using either a User ID or an email address)
export const generateOTPService = async (userId, email) => {
    let finalUserId = userId;
    let finalEmail = email;

    // Scenario 1: Forgot Password (only email available; no User ID)
    if (!finalUserId && finalEmail) {
        const user = await User.findOne({ email: finalEmail });
        if (!user) {
            throw new Error("This email is not associated with any user.");
        }
        finalUserId = user._id.toString();
    }

    // Scenario 2: Payment (only userId available; no email)
    if (finalUserId && !finalEmail) {
        const user = await User.findById(finalUserId);
        if (!user) {
            throw new Error("User not found.");
        }
        finalEmail = user.email;
    }

    if (!finalUserId || !finalEmail) {
        throw new Error("A userId or email is required.");
    }

    const otp = generateRandomOTP();
    const expiresAt = getExpiryDate();
    const key = finalUserId;

    saveOTP(key, otp, expiresAt);

    try {
        await sendOTPEmail(finalEmail, otp);
    } catch (err) {
        // The OTP is useless if it was never actually sent — clean it up and
        // let the user know the payment couldn't go any further because of this.
        deleteOTP(key);
        notifyPaymentIncomplete(
            finalUserId,
            "we couldn't send the OTP code needed to complete this payment. Please try again."
        );
        throw err;
    }

    createNotification({
        userId: finalUserId,
        type: "otp",
        title: "OTP verification required",
        message: `A one-time code was sent to ${finalEmail}. It expires in ${OTP_CONFIG.EXPIRY_MINUTES} minutes.`,
    }).catch((err) => console.error("Failed to create otp notification:", err.message));

    // Passive watcher: if this OTP is STILL sitting in the store once it expires,
    // it means nobody ever attempted to verify it (app closed, tab abandoned, etc.)
    // — not just "wrong code" or "too slow at the verify screen", but never tried at all.
    // verifyOTPService always deletes the record on success, expiry-check, or max-attempts,
    // so if it's still here, the flow was genuinely abandoned.
    setTimeout(() => {
        const stillPending = getOTP(key);
        if (stillPending) {
            deleteOTP(key);
            notifyPaymentIncomplete(
                finalUserId,
                "the OTP was never verified before it expired."
            );
        }
    }, OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000 + 2000); // small buffer after expiry

    return { message: "OTP sent successfully", expiresAt };
};

// 2. OTP Verify (userId is mandatory here)
export const verifyOTPService = async (userId, otp) => {
    const key = userId;
    const otpRecord = getOTP(key);

    if (!otpRecord) {
        throw new Error("No OTP found. Please generate a new one.");
    }

    if (otpRecord.expiresAt < new Date()) {
        deleteOTP(key);
        notifyPaymentIncomplete(userId, "the OTP code expired before it was verified.");
        throw new Error("OTP has expired. Please request a new one.");
    }

    if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
        deleteOTP(key);
        notifyPaymentIncomplete(userId, "too many incorrect OTP attempts.");
        throw new Error("Maximum attempts reached. Please request a new OTP.");
    }

    if (otpRecord.otp !== otp) {
        otpRecord.attempts += 1;
        updateAttempts(key, otpRecord.attempts);
        throw new Error(
            `Invalid OTP. Attempts remaining: ${
                OTP_CONFIG.MAX_ATTEMPTS - otpRecord.attempts
            }`
        );
    }

    deleteOTP(key);
    return { message: "OTP verified successfully", verified: true };
};

// 3. OTP Resend (userId or email is required)
export const resendOTPService = async (userId, email) => {
    let finalUserId = userId;
    let finalEmail = email;

    if (!finalUserId && finalEmail) {
        const user = await User.findOne({ email: finalEmail });
        if (!user) throw new Error("User not found.");
        finalUserId = user._id.toString();
    }

    if (finalUserId && !finalEmail) {
        const user = await User.findById(finalUserId);
        if (!user) throw new Error("User not found.");
        finalEmail = user.email;
    }

    const key = finalUserId;
    const otpRecord = getOTP(key);

    if (otpRecord) {
        const createdAt = new Date(
            otpRecord.expiresAt.getTime() - OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000
        );
        const cooldownEnd =
            createdAt.getTime() + OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000;

        if (Date.now() < cooldownEnd) {
            const waitTime = Math.ceil((cooldownEnd - Date.now()) / 1000);
            throw new Error(`Please wait ${waitTime} seconds before resending.`);
        }
    }

    return await generateOTPService(finalUserId, finalEmail);
};