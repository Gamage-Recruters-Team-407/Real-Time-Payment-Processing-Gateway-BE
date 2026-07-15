// userService.js
// Business logic for: User Dashboard & Profile
// Owner: Developer 2 (User Dashboard & Profile)
//
// Keeps DB/aggregation logic out of the controller so userController.js
// stays thin (just req/res handling).

import User from "../models/User.js";
import Transaction from "../models/Transaction.js"; // Dev 6's model

// -----------------------------------------------------------------------
// Fetch a user by id. Password is select:false on the schema, so it's
// already excluded by default — no need for an extra .select("-password").
// -----------------------------------------------------------------------
export const findUserById = async (userId) => {
  return User.findById(userId);
};

// -----------------------------------------------------------------------
// Aggregate this user's transactions into the Dashboard stat cards
// (Total Volume / Successful / Failed / Success rate).
// Adjust the $match field name below if Dev 6's Transaction schema
// references the user differently (e.g. "userId" instead of "user").
// -----------------------------------------------------------------------
export const getDashboardStats = async (userId) => {
  const [summary] = await Transaction.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: null,
        totalVolume: { $sum: "$amount" },
        totalCount: { $sum: 1 },
        successful: {
          $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
        },
        failed: {
          $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] },
        },
      },
    },
  ]);

  const totalCount = summary?.totalCount || 0;
  const successful = summary?.successful || 0;

  return {
    totalVolume: summary?.totalVolume || 0,
    successful,
    failed: summary?.failed || 0,
    successRate: totalCount ? Number(((successful / totalCount) * 100).toFixed(1)) : 0,
  };
};

// -----------------------------------------------------------------------
// Update editable profile fields (name, phone).
// Email is unique/login-bound and role/accessLabel are access-control,
// so none of those are user-editable from the Profile page.
// -----------------------------------------------------------------------
export const updateUserProfile = async (userId, { name, phone }) => {
  const user = await User.findById(userId);
  if (!user) return null;

  if (name) user.name = name.trim();
  if (phone !== undefined) user.phone = phone.trim();

  await user.save();
  return user;
};