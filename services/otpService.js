import { generateRandomOTP, getExpiryDate } from "../utils/generateOTP.js";
import { saveOTP, getOTP, updateAttempts, deleteOTP } from "../utils/otpStore.js";
import { OTP_CONFIG, getEmailConfig } from "../config/otp.js";
import nodemailer from "nodemailer";

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

// Generate and send OTP email
const sendOTPEmail = async (email, otp) => {
    const EMAIL_CONFIG = getEmailConfig();
    
    if (!EMAIL_CONFIG.USER || !EMAIL_CONFIG.PASS) {
        console.log(`\n============================================`);
        console.log(`[TESTING MODE] OTP for ${email} is: ${otp}`);
        console.log(`============================================\n`);
        return;
    }

    const transporter = createTransporter();
    
    const mailOptions = {
        from: `"Payment Gateway" <${EMAIL_CONFIG.USER}>`,
        to: email,
        subject: "Your OTP Verification Code", // සරල Subject එකක්
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <h2>OTP Verification</h2>
                <p>Your OTP code is: <b style="font-size: 24px; color: #007bff;">${otp}</b></p>
                <p>This code will expire in ${OTP_CONFIG.EXPIRY_MINUTES} minutes.</p>
                <p>If you did not request this, please ignore this email.</p>
            </div>
        `,
    };

    try {
        console.log(`📧 Sending OTP email to ${email}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);
    } catch (error) {
        console.error(`❌ Failed to send email:`, error.message);
        throw new Error("Failed to send OTP email. Please try again.");
    }
};

// OTP Generate 
export const generateOTPService = async (userId, email) => {
    const otp = generateRandomOTP();
    const expiresAt = getExpiryDate();
    const key = userId; // User ID

    saveOTP(key, otp, expiresAt);
    await sendOTPEmail(email, otp);

    return { message: "OTP sent successfully", expiresAt };
};

// OTP Verify 
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

// OTP Resend 
export const resendOTPService = async (userId, email) => {
    const key = userId;
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

    return await generateOTPService(userId, email);
};