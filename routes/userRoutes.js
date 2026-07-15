import express from 'express';
import { body } from 'express-validator';
import userController from '../controllers/userController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = express.Router();

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
