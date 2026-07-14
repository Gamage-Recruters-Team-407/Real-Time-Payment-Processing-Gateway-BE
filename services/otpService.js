import { generateRandomOTP, getExpiryDate } from "../utils/generateOTP.js";
import { saveOTP, getOTP, updateAttempts, deleteOTP } from "../utils/otpStore.js";
import { OTP_CONFIG, getEmailConfig } from "../config/otp.js";
import nodemailer from "nodemailer";
import User from "../models/User.js"; 

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
        from: `"Payment Gateway" <${EMAIL_CONFIG.USER}>`,
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

// ️ 1. OTP Generation (now works using either a User ID or an email address)
export const generateOTPService = async (userId, email) => {
    let finalUserId = userId;
    let finalEmail = email;

    // Scenario 1: Forgot Password (only email available; no User ID)
    if (!finalUserId && finalEmail) {
        const user = await User.findOne({ email: finalEmail });
        if (!user) {
            // For security reasons, it doesn't explicitly say "User not found."
            // But let's simply trigger an error for this project.
            throw new Error("This email is not associated with any user.");
        }
        finalUserId = user._id.toString(); // retrieving the userId from the database.
    }

    // Scenario 2: Payment (only userId available; no email)
    if (finalUserId && !finalEmail) {
        const user = await User.findById(finalUserId);
        if (!user) {
            throw new Error("User not found.");
        }
        finalEmail = user.email; // retrieving the email from the database
    }

    // Now we have both finalUserId and finalEmail.
    if (!finalUserId || !finalEmail) {
        throw new Error("A userId or email is required.");
    }

    const otp = generateRandomOTP();
    const expiresAt = getExpiryDate();
    const key = finalUserId; // The userId is used as the key.

    saveOTP(key, otp, expiresAt);
    await sendOTPEmail(finalEmail, otp);

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
        throw new Error("OTP has expired. Please request a new one.");
    }

    if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
        deleteOTP(key);
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
    // For the resend operation as well, you first need to retrieve the userId and email.
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