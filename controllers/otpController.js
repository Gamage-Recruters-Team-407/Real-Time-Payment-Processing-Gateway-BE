import {
    generateOTPService,
    verifyOTPService,
    resendOTPService,
} from "../services/otpService.js";

export const generateOTPController = async (req, res) => {
    try {
        const { userId, email } = req.body; 
        if (!userId || !email) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        const result = await generateOTPService(userId, email);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const verifyOTPController = async (req, res) => {
    try {
        const { userId, otp } = req.body; 
        if (!userId || !otp) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        const result = await verifyOTPService(userId, otp);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const resendOTPController = async (req, res) => {
    try {
        const { userId, email } = req.body; 
        if (!userId || !email) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        const result = await resendOTPService(userId, email);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};