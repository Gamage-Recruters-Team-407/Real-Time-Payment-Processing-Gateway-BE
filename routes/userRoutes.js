// userRoutes.js
// Routes for: User Dashboard & Profile
// Owner: Developer 2

import express from "express";
import { protect } from "../middleware/authMiddleware.js"; // Dev 13's JWT middleware
import { getDashboard, getProfile, updateProfile } from "../controllers/userController.js";

const router = express.Router();

// GET  /api/users/me       -> Dashboard.jsx uses this
router.get("/me", protect, getDashboard);

// GET  /api/users/profile  -> Profile.jsx uses this
router.get("/profile", protect, getProfile);

// PUT  /api/users/profile  -> Profile.jsx "Save Changes" uses this
router.put("/profile", protect, updateProfile);

export default router;