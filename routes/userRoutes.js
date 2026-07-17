import express from 'express';
import { body } from 'express-validator';
import userController from '../controllers/userController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';
import { default as protect } from "../middleware/authMiddleware.js";
import { getDashboard, getProfile, updateProfile } from "../controllers/userController.js";

const router = express.Router();


 
// GET  /api/users/me       -> Dashboard.jsx uses this
router.get("/me", protect, getDashboard);
 
// GET  /api/users/profile  -> Profile.jsx uses this
router.get("/profile", protect, getProfile);
 
// PUT  /api/users/profile  -> Profile.jsx "Save Changes" uses this
router.put("/profile", protect, updateProfile);


// List & search users (admin-only)
router.get('/', authMiddleware, adminMiddleware, userController.listUsers);

// Create user
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  [
    body('name').isString().isLength({ min: 1 }),
    body('email').isEmail(),
    body('role').optional().isString(),
    body('password').optional().isLength({ min: 6 }),
  ],
  userController.createUser
);

// Get single user
router.get('/:id', authMiddleware, adminMiddleware, userController.getUser);

// Update user
router.put('/:id', authMiddleware, adminMiddleware, userController.updateUser);

// Delete user
router.delete('/:id', authMiddleware, adminMiddleware, userController.removeUser);

export default router;
