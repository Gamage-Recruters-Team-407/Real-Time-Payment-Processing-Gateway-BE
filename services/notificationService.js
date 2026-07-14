import Notification from "../models/Notification.js";

/**
 * Turns a "Today / Yesterday / This Week / Earlier" bucket + a human-readable
 * timestamp string out of a Date. Computed server-side so every client
 * (web, mobile) shows the same grouping regardless of its own timezone.
 */
function formatNotification(doc) {
  const now = new Date();
  const created = new Date(doc.createdAt);
  const isSameDay = created.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = created.toDateString() === yesterday.toDateString();

  const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));

  let group = "Earlier";
  if (isSameDay) group = "Today";
  else if (isYesterday) group = "Yesterday";
  else if (diffDays <= 7) group = "This Week";

  let timestamp;
  const timeStr = created.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (group === "Today") timestamp = timeStr;
  else if (group === "Yesterday") timestamp = `Yesterday, ${timeStr}`;
  else
    timestamp = created.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  return {
    id: doc._id,
    type: doc.type,
    title: doc.title,
    message: doc.message,
    read: doc.read,
    actionLabel: doc.actionLabel,
    link: doc.link,
    group,
    timestamp,
    createdAt: doc.createdAt,
  };
}

/**
 * Creates a notification for a user. Other modules (Payment, Settlement,
 * OTP, Fraud) should import and call this directly instead of hitting the
 * HTTP route, e.g.:
 *   import { createNotification } from "../services/notificationService.js";
 *   await createNotification({ userId, type: "payment_success", title, message });
 */
export const createNotification = async ({
  userId,
  title,
  message,
  type = "system",
  actionLabel,
  link,
}) => {
  return Notification.create({ userId, title, message, type, actionLabel, link });
};

export const getUserNotifications = async (userId, { filter } = {}) => {
  const query = { userId };

  if (filter === "unread") {
    query.read = false;
  } else if (filter && filter !== "all") {
    query.type = { $in: filter.split(",") };
  }

  const docs = await Notification.find(query).sort({ createdAt: -1 });
  return docs.map(formatNotification);
};

export const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ userId, read: false });
};

export const markAsRead = async (userId, notificationId) => {
  const doc = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  );
  return doc ? formatNotification(doc) : null;
};

export const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { userId, read: false },
    { read: true }
  );
  return result.modifiedCount;
};

export const deleteNotification = async (userId, notificationId) => {
  return Notification.findOneAndDelete({ _id: notificationId, userId });
};