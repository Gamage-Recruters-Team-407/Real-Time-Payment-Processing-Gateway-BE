import * as notificationService from "../services/notificationService.js";

// GET /api/notifications?filter=unread | all | payment_success,payment_failed,settlement | security,otp
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { filter } = req.query;

    const notifications = await notificationService.getUserNotifications(userId, {
      filter,
    });

    res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/notifications/unread-count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id;
    const count = await notificationService.getUnreadCount(userId);
    res.status(200).json({ success: true, data: { count } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/notifications/:id/read
export const markNotificationRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const updated = await notificationService.markAsRead(userId, id);

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/notifications/read-all
export const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const modifiedCount = await notificationService.markAllAsRead(userId);
    res.status(200).json({ success: true, data: { modifiedCount } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/notifications/:id
export const deleteNotificationById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const deleted = await notificationService.deleteNotification(userId, id);

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/notifications  (mainly for manual/testing use — other modules should
// call notificationService.createNotification() directly instead of this route)
export const createNotificationManually = async (req, res) => {
  try {
    const { userId, title, message, type, actionLabel, link } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "userId, title and message are required",
      });
    }

    const created = await notificationService.createNotification({
      userId,
      title,
      message,
      type,
      actionLabel,
      link,
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};