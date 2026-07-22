import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import { validateCardDetails } from '../utils/validateCard.js';
import { createNotification, notifyAdmins } from './notificationService.js';

function isDbConnected() {
    return mongoose.connection && mongoose.connection.readyState === 1;
}

/**
 * Processes a card payment.
 * IMPORTANT: success is only ever reported (and a "payment_success" notification
 * only ever fires) once the payment record is actually persisted to the database
 * with status COMPLETED. Every other path — validation failure, DB unavailable,
 * or a save error — reports success:false and fires a "payment_failed" notification.
 * @param {object} paymentData
 * @returns {Promise<{success: boolean, message: string, payment?: object, errors?: string[]}>}
 */
export async function processCardPayment(paymentData) {
    const { userId, amount, cardDetails } = paymentData;

    const validation = validateCardDetails(cardDetails);
    if (!validation.isValid) {
        if (userId) {
            createNotification({
                userId,
                type: "payment_failed",
                title: "Payment declined",
                message: `Card validation failed: ${validation.errors?.join(", ") || "invalid card details"}.`,
            }).catch((err) => console.error("Failed to create payment_failed notification:", err.message));
        }
        return {
            success: false,
            message: "Validation failed",
            errors: validation.errors
        };
    }

    const lastFour = cardDetails.cardNumber.replace(/\s+/g, '').slice(-4);
    const generatedTransactionId = `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;

    if (!isDbConnected()) {
        console.error("processCardPayment: MongoDB is not connected — payment cannot be completed.");
        if (userId) {
            createNotification({
                userId,
                type: "payment_failed",
                title: "Payment could not be completed",
                message: `LKR ${Number(amount).toLocaleString("en-LK")} payment failed — service temporarily unavailable. Please try again.`,
            }).catch((err) => console.error("Failed to create payment_failed notification:", err.message));
        }
        return {
            success: false,
            message: "Payment could not be completed — database unavailable",
        };
    }

    try {
        const payment = new Payment({
            paymentId: paymentData.paymentId || `PAY-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`,
            userId: userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null,
            amount: Number(amount),
            currency: "LKR",
            paymentMethod: "CARD",
            cardLastFourDigits: lastFour,
            status: "COMPLETED",
            transactionId: generatedTransactionId
        });

        await payment.save();

        console.log("\n============================================\n[LOG] Card Payment completed and saved:\n", payment, "\n============================================\n");

        if (userId) {
            createNotification({
                userId,
                type: "payment_success",
                title: "Payment received",
                message: `LKR ${Number(amount).toLocaleString("en-LK")} was successfully processed. Card ending ${lastFour}.`,
                actionLabel: "View receipt",
                link: `/payment-history`,
            }).catch((err) => console.error("Failed to create payment_success notification:", err.message));
        }

        notifyAdmins({
            type: "payment_success",
            title: "Payment completed",
            message: `A payment of LKR ${Number(amount).toLocaleString("en-LK")} (card ending ${lastFour}) was completed by user ${userId || "unknown"}.`,
            actionLabel: "View transaction",
            link: `/transaction-management`,
        }).catch((err) => console.error("Failed to notify admins of payment:", err.message));

        return {
            success: true,
            message: "Payment processed successfully",
            payment,
        };
    } catch (err) {
        console.error("processCardPayment: failed to save payment:", err.message);

        if (userId) {
            createNotification({
                userId,
                type: "payment_failed",
                title: "Payment failed",
                message: `LKR ${Number(amount).toLocaleString("en-LK")} payment could not be completed due to a system error. No amount was charged.`,
            }).catch((notifyErr) => console.error("Failed to create payment_failed notification:", notifyErr.message));
        }

        return {
            success: false,
            message: `Payment could not be completed: ${err.message}`,
        };
    }
}

export async function createPendingPayment({
    paymentId,
    userId,
    amount,
    currency = "LKR",
    description = "",
    paymentMethod = "CARD",
    destinationAccountKey = "PRIMARY_BANK_ACCOUNT",
}) {
    const payment = new Payment({
        paymentId,
        userId: userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null,
        amount: Number(amount),
        currency,
        description,
        paymentMethod,
        destinationAccountKey,
        status: "PENDING",
    });

    await payment.save();
    return payment;
}

export async function findPaymentById(paymentId) {
    return Payment.findOne({ paymentId });
}

export async function findPaymentByObjectId(id) {
    return Payment.findById(id);
}

export async function findAllPayments() {
    return Payment.find().sort({ createdAt: -1 });
}

export async function updatePaymentStatusInService(paymentId, { status, transactionId, cardLastFourDigits }) {
    const payment = await Payment.findOne({ paymentId });
    if (!payment) return null;

    const previousStatus = payment.status;

    if (status) payment.status = status;
    if (transactionId !== undefined) payment.transactionId = transactionId;
    if (cardLastFourDigits !== undefined) payment.cardLastFourDigits = cardLastFourDigits;

    await payment.save();

    const userId = payment.userId;
    const amountLabel = `LKR ${Number(payment.amount).toLocaleString("en-LK")}`;

    if (status === "COMPLETED" && previousStatus !== "COMPLETED" && userId) {
        createNotification({
            userId,
            type: "payment_success",
            title: "Payment received",
            message: `${amountLabel} was successfully processed.`,
            actionLabel: "View receipt",
            link: `/payment-history`,
        }).catch((err) => console.error("Failed to create payment_success notification:", err.message));

        notifyAdmins({
            type: "payment_success",
            title: "Payment completed",
            message: `A payment of ${amountLabel} was completed by user ${userId}.`,
            actionLabel: "View transaction",
            link: `/transaction-management`,
        }).catch((err) => console.error("Failed to notify admins of payment:", err.message));
    } else if (status === "FAILED" && previousStatus !== "FAILED" && userId) {
        createNotification({
            userId,
            type: "payment_failed",
            title: "Payment failed",
            message: `${amountLabel} payment could not be completed.`,
        }).catch((err) => console.error("Failed to create payment_failed notification:", err.message));
    }

    return payment;
}