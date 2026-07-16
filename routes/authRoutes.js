import express from "express";
import { registerUser, loginUser, getMe, resetPassword } from "../controllers/AuthController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", authMiddleware, getMe);
router.post("/reset-password", resetPassword);

export default router;