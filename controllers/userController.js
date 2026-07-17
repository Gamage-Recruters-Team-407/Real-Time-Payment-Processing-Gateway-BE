import * as userService from '../services/userService.js';
import { validationResult } from 'express-validator';
import {
  findUserById,
  getDashboardStats,
  updateUserProfile,
} from "../services/userService.js";


// -----------------------------------------------------------------------
// GET /api/users/me
// Returns logged-in user's basic info + dashboard summary stats.
// Used by Dashboard.jsx.
// -----------------------------------------------------------------------
export const getDashboard = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
 
    const stats = await getDashboardStats(user._id);
 
    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accessLabel: user.accessLabel,
      stats,
    });
  } catch (err) {
    console.error("getDashboard error:", err.message);
    return res.status(500).json({ message: "Server error loading dashboard" });
  }
};
 
// -----------------------------------------------------------------------
// GET /api/users/profile
// Returns full profile of the logged-in user.
// Used by Profile.jsx.
// -----------------------------------------------------------------------
export const getProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json(user);
  } catch (err) {
    console.error("getProfile error:", err.message);
    return res.status(500).json({ message: "Server error loading profile" });
  }
};
 
// -----------------------------------------------------------------------
// PUT /api/users/profile
// Updates editable profile fields (name, phone). Email is the unique
// login identifier and role/accessLabel are access-control, so none of
// those are editable here (email change -> Settings flow, role -> Admin).
// Used by Profile.jsx "Save Changes".
// -----------------------------------------------------------------------
export const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
 
    if ((!name || !name.trim()) && phone === undefined) {
      return res.status(400).json({ message: "Nothing to update" });
    }
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }
 
    const updatedUser = await updateUserProfile(req.user.id, { name, phone });
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
 
    return res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        accessLabel: updatedUser.accessLabel,
      },
    });
  } catch (err) {
    console.error("updateProfile error:", err.message);
    return res.status(500).json({ message: "Server error updating profile" });
  }
};

export const createUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const user = await userService.createUser(req.body);
    return res.status(201).json({ success: true, data: user });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const listUsers = async (req, res) => {
  try {
    const { page, limit, search, role } = req.query;
    const result = await userService.getUsers({ page, limit, search, role });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    return res.json({ success: true, data: user });
  } catch (err) {
    return res.status(404).json({ success: false, message: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return res.json({ success: true, data: user });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const removeUser = async (req, res) => {
  try {
    await userService.deleteUser(req.params.id);
    return res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export default {
  createUser,
  listUsers,
  getUser,
  updateUser,
  removeUser,
};
