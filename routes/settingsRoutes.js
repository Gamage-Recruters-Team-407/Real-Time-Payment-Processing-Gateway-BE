import express from "express";
import {
  getSettings,
  updateSettings,
  changePassword,
  sendResetLink
} from "../controllers/settingsController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getSettings);
router.put("/", authMiddleware, updateSettings);
router.put("/password", authMiddleware, changePassword);
router.post("/reset-link", authMiddleware, sendResetLink);

export default router;
