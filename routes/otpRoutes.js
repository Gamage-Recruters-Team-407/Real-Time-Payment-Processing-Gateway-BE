import express from "express";
import {
    generateOTPController,
    verifyOTPController,
    resendOTPController,
} from "../controllers/otpController.js";

const router = express.Router();

router.post("/generate", generateOTPController);
router.post("/verify", verifyOTPController);
router.post("/resend", resendOTPController);

export default router;