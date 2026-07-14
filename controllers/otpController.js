import {
    generateOTPService,
    verifyOTPService,
    resendOTPService,
} from "../services/otpService.js";
import User from "../models/User.js"; 

export const generateOTPController = async (req, res) => {
    try {
        const { userId, email } = req.body;
        if (!userId && !email) {
            return res.status(400).json({ success: false, message: "userId or email is required." });
        }
        const result = await generateOTPService(userId, email);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// This function verifies the OTP provided by the user. It checks if the OTP is valid and not expired.
export const verifyOTPController = async (req, res) => {
    try {
        const { userId, email, otp } = req.body;
        if (!otp) {
            return res.status(400).json({ success: false, message: "OTP is required." });
        }

        let finalUserId = userId;
        
        // If userId is not provided but email is, find the userId using the email
        if (!finalUserId && email) {
            const user = await User.findOne({ email: email });
            if (!user) {
                return res.status(400).json({ success: false, message: "This email is not associated with any user." });
            }
            finalUserId = user._id.toString();
        }

        if (!finalUserId) {
            return res.status(400).json({ success: false, message: "userId or email is required." });
        }

        const result = await verifyOTPService(finalUserId, otp);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

export const resendOTPController = async (req, res) => {
    try {
        const { userId, email } = req.body;
        if (!userId && !email) {
            return res.status(400).json({ success: false, message: "userId or email is required." });
        }
        const result = await resendOTPService(userId, email);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};