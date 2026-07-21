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
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Please enter a valid email'),
    body('phone').optional({ values: 'falsy' }).isString(),
    body('role').optional().isString(),
    body('password').notEmpty().isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  userController.createUser
);

// Get single user
router.get('/:id', authMiddleware, adminMiddleware, userController.getUser);

// Update user
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  [
    body('name').optional({ values: 'falsy' }).trim().isLength({ min: 1 }).withMessage('Name cannot be empty'),
    body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Please enter a valid email'),
    body('phone').optional({ values: 'falsy' }).isString(),
    body('role').optional({ values: 'falsy' }).isString(),
  ],
  userController.updateUser
);

// Delete user
router.delete('/:id', authMiddleware, adminMiddleware, userController.removeUser);

export default router;
