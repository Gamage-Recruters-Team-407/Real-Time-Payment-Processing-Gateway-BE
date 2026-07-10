import express from "express";

import {
  createPayment,
  getPaymentById,
} from "../controllers/PaymentController.js";

const router = express.Router();

router.post("/", createPayment);

router.get("/:paymentId", getPaymentById);

export default router;