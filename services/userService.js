import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import Transaction from "../models/Transaction.js";

 
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
 

export const createUser = async (data) => {
  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) throw new Error('Email already in use');

  const password = data.password || Math.random().toString(36).slice(-8);
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  const user = new User({
    name: data.name,
    email: data.email.toLowerCase(),
    password: hash,
    role: data.role,
    phone: data.phone || '',
  });

  await user.save();
  const obj = user.toObject();
  delete obj.password;
  return obj;
};

export const getUsers = async ({ page = 1, limit = 10, search = '', role }) => {
  const q = {};
  if (search) {
    const re = new RegExp(search, 'i');
    q.$or = [{ name: re }, { email: re }];
  }
  if (role) q.role = role;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(q).select('-password').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
    User.countDocuments(q),
  ]);

  return {
    items,
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / limit || 1),
  };
};

export const getUserById = async (id) => {
  const user = await User.findById(id).select('-password');
  if (!user) throw new Error('User not found');
  return user;
};

export const updateUser = async (id, data) => {
  const update = { ...data };
  if (update.password) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(update.password, salt);
  }
  const user = await User.findByIdAndUpdate(id, update, { new: true }).select('-password');
  if (!user) throw new Error('User not found');
  return user;
};

export const deleteUser = async (id) => {
  const user = await User.findByIdAndDelete(id);
  if (!user) throw new Error('User not found');
  return true;
};

export default {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};
