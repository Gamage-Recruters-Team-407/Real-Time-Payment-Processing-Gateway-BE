import Refund from "../models/Refund.js";
import Transaction from "../models/Transaction.js";
import * as refundService from "../services/refundService.js";
import cloudinary from "../config/cloudinary.js";   // your Cloudinary config
import { Readable } from "stream";                  // for buffer → stream

// ---------- Helper: upload buffer to Cloudinary ----------
const uploadImageToCloudinary = (buffer, mimetype) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "refund_photos" },   // optional folder name
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
    });
};

// ---------- Generate refund ID (your existing function) ----------
const generateRefundId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    return `REF-${year}${month}${day}-${random}`;
};

// ---------- CREATE REFUND (with Cloudinary upload) ----------
export const createRefund = async (req, res) => {
    try {
        let { name, transactionId, phone, amount, reason } = req.body;

        // Auto‑fill amount from transaction if not provided
        if ((amount === undefined || amount === null) && transactionId) {
            const txn = await Transaction.findOne({
                transactionId: String(transactionId).trim(),
            });
            amount = txn ? txn.amount : 0;
        }

        // Validate all fields including file
        const itemPhoto = req.file
            ? (req.file.path || req.file.secure_url)
            : req.body.itemPhoto;

        if (
            !name ||
            !transactionId ||
            !phone ||
            amount === undefined ||
            amount === null ||
            !reason ||
            !itemPhoto
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required (including item photo).",
            });
        }

        // ---------- Upload image to Cloudinary ----------
        let itemPhotoUrl;
        try {
            const result = await uploadImageToCloudinary(
                req.file.buffer,
                req.file.mimetype
            );
            itemPhotoUrl = result.secure_url;   // Cloudinary URL
        } catch (uploadError) {
            console.error("Cloudinary upload failed:", uploadError.message);
            return res.status(500).json({
                success: false,
                message: "Image upload failed. Please try again.",
            });
        }

        // Create refund with Cloudinary URL
        const refund = await Refund.create({
            refundId: generateRefundId(),
            name: String(name).trim(),
            transactionId: String(transactionId).trim(),
            phone: String(phone).trim(),
            amount: Number(amount),
            reason: String(reason).trim(),
            itemPhoto: String(itemPhoto).trim(),
        });

        res.status(201).json({
            success: true,
            message: "Refund submitted successfully.",
            data: refund,
        });
    } catch (error) {
        // 🔥 Detailed error logging (fixes [object object])
        console.error("❌ Error in createRefund:");
        console.error("Message:", error.message);
        console.error("Stack:", error.stack);
        if (error.response) {
            console.error("Cloudinary response:", JSON.stringify(error.response.data, null, 2));
        }

        res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
};

// ---------- The rest of your functions stay exactly the same ----------
export const getAllRefunds = async (req, res) => {
    try {
        const refunds = await refundService.getAllRefunds();
        res.status(200).json(refunds);
    } catch (error) {
        console.error("Error fetching refunds:", error.message);
        res.status(500).json({ message: error.message });
    }
};

export const getRefundById = async (req, res) => {
    try {
        const refund = await refundService.getRefundById(req.params.id);
        if (!refund) {
            return res.status(404).json({ message: "Refund not found" });
        }
        res.status(200).json(refund);
    } catch (error) {
        console.error("Error fetching refund by ID:", error.message);
        res.status(500).json({ message: error.message });
    }
};

export const approveRefund = async (req, res) => {
    try {
        const refund = await Refund.findByIdAndUpdate(
            req.params.id,
            {
                status: "APPROVED",
                approvedDate: new Date(),
            },
            { new: true }
        );
        if (!refund) {
            return res.status(404).json({ message: "Refund not found" });
        }
        res.status(200).json(refund);
    } catch (error) {
        console.error("Error approving refund:", error.message);
        res.status(500).json({ message: error.message });
    }
};

export const rejectRefund = async (req, res) => {
    try {
        const refund = await Refund.findByIdAndUpdate(
            req.params.id,
            {
                status: "REJECTED",
                approvedDate: null,
            },
            { new: true }
        );
        if (!refund) {
            return res.status(404).json({ message: "Refund not found" });
        }
        res.status(200).json(refund);
    } catch (error) {
        console.error("Error rejecting refund:", error.message);
        res.status(500).json({ message: error.message });
    }
};

export const refundPayment = async (req, res) => {
    try {
        const refund = await Refund.findByIdAndUpdate(
            req.params.id,
            {
                status: "REFUNDED",
                refundedDate: new Date(),
            },
            { new: true }
        );
        if (!refund) {
            return res.status(404).json({ message: "Refund not found" });
        }
        res.status(200).json(refund);
    } catch (error) {
        console.error("Error refunding payment:", error.message);
        res.status(500).json({ message: error.message });
    }
};

export const deleteRefund = async (req, res) => {
    try {
        await refundService.deleteRefund(req.params.id);
        res.status(200).json({ message: "Refund deleted successfully" });
    } catch (error) {
        console.error("Error deleting refund:", error.message);
        res.status(500).json({ message: error.message });
    }
};