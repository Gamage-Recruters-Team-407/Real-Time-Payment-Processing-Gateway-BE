import mongoose from 'mongoose';
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
 

const allowedRoleValues = User.schema.path('role').enumValues || ['Admin', 'User', 'admin', 'user'];
const emailRegex = /^\S+@\S+\.\S+$/;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createUser = async (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid user payload');
  }

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
  const password = typeof data.password === 'string' ? data.password : '';
  const role = typeof data.role === 'string' ? data.role : '';

  if (!name) throw new Error('Name is required');
  if (!email || !emailRegex.test(email)) throw new Error('Please enter a valid email');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');
  if (!allowedRoleValues.includes(role)) throw new Error('Invalid role');
  if (phone && !/^\+?[0-9\s-]{7,15}$/.test(phone)) throw new Error('Please enter a valid phone number');

  const existing = await User.findOne({ email });
  if (existing) throw new Error('Email already in use');

  const user = new User({
    name,
    email,
    password,
    role,
    phone,
  });

  await user.save();
  const obj = user.toObject();
  delete obj.password;
  return obj;
};

export const getUsers = async ({ page = 1, limit = 10, search = '', role } = {}) => {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);
  const safePage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const safeLimit = Number.isNaN(parsedLimit) ? 10 : parsedLimit;
  const boundedLimit = safeLimit < 1 ? 10 : Math.min(safeLimit, 100);

  const query = {};
  if (search) {
    const escapedSearch = escapeRegExp(search.trim());
    const re = new RegExp(escapedSearch, 'i');
    query.$or = [{ name: re }, { email: re }];
  }
  if (role) {
    if (!allowedRoleValues.includes(role)) throw new Error('Invalid role');
    query.role = role;
  }

  const skip = (safePage - 1) * boundedLimit;
  const [items, total] = await Promise.all([
    User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(boundedLimit),
    User.countDocuments(query),
  ]);

  const pages = total === 0 ? 1 : Math.ceil(total / boundedLimit);

  return {
    items,
    total,
    page: safePage,
    pages,
  };
};

export const getUserById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid user id');
  }

  const user = await User.findById(id).select('-password');
  if (!user) throw new Error('User not found');
  return user;
};

export const updateUser = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid user id');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid user payload');
  }

  const user = await User.findById(id);
  if (!user) throw new Error('User not found');

  const allowedFields = ['name', 'email', 'phone', 'role'];
  const updates = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      updates[field] = data[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    const obj = user.toObject();
    delete obj.password;
    return obj;
  }

  if (updates.name !== undefined) {
    const trimmedName = typeof updates.name === 'string' ? updates.name.trim() : '';
    if (!trimmedName) throw new Error('Name cannot be empty');
    updates.name = trimmedName;
  }

  if (updates.phone !== undefined) {
    updates.phone = typeof updates.phone === 'string' ? updates.phone.trim() : '';
    if (updates.phone && !/^\+?[0-9\s-]{7,15}$/.test(updates.phone)) {
      throw new Error('Please enter a valid phone number');
    }
  }

  if (updates.email !== undefined) {
    const normalizedEmail = typeof updates.email === 'string' ? updates.email.trim().toLowerCase() : '';
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      throw new Error('Please enter a valid email');
    }
    const duplicate = await User.findOne({ email: normalizedEmail, _id: { $ne: id } });
    if (duplicate) throw new Error('Email already in use');
    updates.email = normalizedEmail;
  }

  if (updates.role !== undefined) {
    if (!allowedRoleValues.includes(updates.role)) throw new Error('Invalid role');
  }

  Object.assign(user, updates);
  await user.save({ validateBeforeSave: true });
  const obj = user.toObject();
  delete obj.password;
  return obj;
};

export const deleteUser = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid user id');
  }

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
