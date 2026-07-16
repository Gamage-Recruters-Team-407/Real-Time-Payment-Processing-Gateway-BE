import * as userService from '../services/userService.js';
import { validationResult } from 'express-validator';

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
