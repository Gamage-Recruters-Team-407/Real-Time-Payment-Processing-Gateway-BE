import express from "express";
import { registerUser, loginUser, getMe, forgotPassword } from "../controllers/AuthController.js";
import { resetPassword } from "../controllers/settingsController.js";
import authMiddleware from "../middleware/authMiddleware.js";


const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", authMiddleware, getMe);

export default router;