import express from "express";
import { createRefund } from "../controllers/RefundController.js";

const router = express.Router();

// Submit refund request
router.post("/", createRefund);

export default router;
