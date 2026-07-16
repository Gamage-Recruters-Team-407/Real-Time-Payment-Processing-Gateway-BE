import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationById,
  createNotificationManually,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All notification routes require a logged-in user (Dev 1/13's authMiddleware
// is expected to set req.user = { id, ... } from the JWT).
router.use(protect);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);
router.delete("/:id", deleteNotificationById);
router.post("/", createNotificationManually);

export default router;