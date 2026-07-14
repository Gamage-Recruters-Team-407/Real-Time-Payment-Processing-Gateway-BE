import { OTP_CONFIG } from "../config/otp.js";

export const generateRandomOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const getExpiryDate = () => {
    return new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);
};