import express from "express";
import { createRefund, getAllRefunds,
  getRefundById,
  approveRefund,
  rejectRefund,
  refundPayment,
  deleteRefund, } from "../controllers/RefundController.js";

const router = express.Router();

// Submit refund request
router.post("/", createRefund);



router.get("/all", getAllRefunds);

router.get("/:id", getRefundById);

router.put("/:id/approve", approveRefund);

router.put("/:id/reject", rejectRefund);

router.put("/:id/refund", refundPayment);

router.delete("/:id", deleteRefund);

export default router;
