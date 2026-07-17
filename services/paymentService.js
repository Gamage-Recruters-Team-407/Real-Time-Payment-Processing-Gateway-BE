import Payment from '../models/Payment.js';
import Transaction from '../models/Transaction.js';
import { validateCardDetails } from '../utils/validateCard.js';
import { createNotification } from './notificationService.js';

const PAYMENT_TO_TRANSACTION_STATUS = {
    PENDING: "Pending",
    PROCESSING: "Processing",
    COMPLETED: "Successful",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
};

const mapPaymentStatusToTransactionStatus = (status) =>
    PAYMENT_TO_TRANSACTION_STATUS[String(status || "").toUpperCase()] || "Pending";

const buildTransactionHistoryEntry = (status, previousStatus, reason) => ({
    status,
    previousStatus: previousStatus ?? null,
    changedAt: new Date(),
    reason,
});

async function syncTransactionForPayment({
    payment,
    previousPaymentStatus,
    customerName,
    customerEmail,
    metadata = {},
}) {
    const transactionStatus = mapPaymentStatusToTransactionStatus(payment.status);
    const previousTransactionStatus = previousPaymentStatus
        ? mapPaymentStatusToTransactionStatus(previousPaymentStatus)
        : null;

    const existingTransaction = payment.transactionId
        ? await Transaction.findOne({ transactionId: payment.transactionId })
        : null;

    if (!existingTransaction) {
        const transaction = new Transaction({
            transactionId: payment.transactionId,
            merchantName: process.env.SINGLE_SHOP_MERCHANT || process.env.SHOP_NAME || "Main Shop",
            customerName: customerName || "Card Customer",
            customerEmail: customerEmail || "",
            amount: Number(payment.amount),
            currency: payment.currency || "LKR",
            paymentMethod: payment.paymentMethod || "CARD",
            status: transactionStatus,
            paymentReference: payment.paymentId,
            description: payment.description || "",
            metadata: {
                source: "payment-service",
                paymentId: payment.paymentId,
                destinationAccountKey: payment.destinationAccountKey || null,
                cardLastFourDigits: payment.cardLastFourDigits || null,
                userId: payment.userId ? String(payment.userId) : null,
                ...metadata,
            },
            lifecycleHistory: [
                buildTransactionHistoryEntry(
                    transactionStatus,
                    null,
                    "Transaction created from payment flow"
                ),
            ],
        });

        await transaction.save();
        return transaction;
    }

    existingTransaction.customerName =
        customerName || existingTransaction.customerName || "Card Customer";
    existingTransaction.customerEmail =
        customerEmail || existingTransaction.customerEmail || "";
    existingTransaction.amount = Number(payment.amount);
    existingTransaction.currency = payment.currency || existingTransaction.currency || "LKR";
    existingTransaction.paymentMethod = payment.paymentMethod || existingTransaction.paymentMethod || "CARD";
    existingTransaction.paymentReference = payment.paymentId || existingTransaction.paymentReference;
    existingTransaction.description = payment.description || existingTransaction.description || "";
    existingTransaction.metadata = {
        ...(existingTransaction.metadata || {}),
        source: "payment-service",
        paymentId: payment.paymentId,
        destinationAccountKey: payment.destinationAccountKey || null,
        cardLastFourDigits: payment.cardLastFourDigits || null,
        userId: payment.userId ? String(payment.userId) : null,
        ...metadata,
    };

    if (existingTransaction.status !== transactionStatus) {
        existingTransaction.lifecycleHistory.push(
            buildTransactionHistoryEntry(
                transactionStatus,
                previousTransactionStatus || existingTransaction.status,
                `Payment status changed from ${previousPaymentStatus || "N/A"} to ${payment.status}`
            )
        );
        existingTransaction.status = transactionStatus;
    }

    await existingTransaction.save();
    return existingTransaction;
}

/**
 * Processes a card payment.
 * @param {object} paymentData 
 * @returns {Promise<object>}
 */
export async function processCardPayment(paymentData) {
    const { userId, amount, cardDetails, customerName, customerEmail, description } = paymentData;

    // 1. Validate Card Details using validation utility
    const validation = validateCardDetails(cardDetails);
    if (!validation.isValid) {
        // Fire-and-forget: a failed notification should never block the payment response.
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
    const generatedReferenceNo = `REF-${Math.floor(10000000 + Math.random() * 90000000)}`;

    try {
        const mongoose = (await import('mongoose')).default;
        
        // If MongoDB connection is active (readyState === 1)
        if (mongoose.connection && mongoose.connection.readyState === 1) {
            // Create Payment record matching the Mongoose schema exactly
            const payment = new Payment({
                paymentId: paymentData.paymentId || `PAY-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`,
                userId: userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null,
                amount: Number(amount),
                currency: "LKR",
                paymentMethod: "CARD",
                cardLastFourDigits: lastFour,
                status: paymentData.status || "PENDING",
                transactionId: generatedTransactionId,
                description: description || "",
            });
            console.log("\n============================================\n[TEST LOG] processCardPayment saving document. Input data:", paymentData, "\nDocument to save:\n", payment, "\n============================================\n");
            await payment.save();
            try {
                await syncTransactionForPayment({
                    payment,
                    customerName: customerName || cardDetails.cardholderName,
                    customerEmail,
                    metadata: {
                        channel: "card-payment",
                    },
                });
            } catch (syncError) {
                await Payment.deleteOne({ _id: payment._id });
                throw syncError;
            }
            console.log("\n============================================\n[TEST LOG] Card Payment processed:\n", payment, "\n============================================\n");

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

            return {
                success: true,
                message: "Payment processed successfully",
                paymentId: payment.paymentId,
                transactionId: payment.transactionId,
                referenceNo: generatedReferenceNo,
                amount: Number(amount),
                payment
            };
        }

        throw new Error("MongoDB connection is not available for real transaction processing");
    } catch (err) {
        console.error("paymentService database error:", err.message);
        throw err;
    }
}

/**
 * Creates a PENDING payment record.
 * @param {object} paymentData 
 * @returns {Promise<object>}
 */
export async function createPendingPayment(paymentData) {
    const {
        paymentId,
        userId,
        amount,
        currency,
        description,
        paymentMethod,
        destinationAccountKey,
        customerName,
        customerEmail,
    } = paymentData;
    
    const payment = new Payment({
        paymentId,
        userId: userId || null,
        amount: Number(amount),
        currency: currency || "LKR",
        paymentMethod: paymentMethod || "CARD",
        description: description || "",
        status: "PENDING",
        destinationAccountKey
    });

    console.log("\n============================================\n[TEST LOG] createPendingPayment saving document. Input data:", paymentData, "\nDocument to save:\n", payment, "\n============================================\n");
    await payment.save();
    await syncTransactionForPayment({
        payment,
        customerName,
        customerEmail,
        metadata: {
            channel: "payment-request",
        },
    });
    return payment;
}

/**
 * Finds a payment by its paymentId.
 * @param {string} paymentId 
 * @returns {Promise<object|null>}
 */
export async function findPaymentById(paymentId) {
    return await Payment.findOne({ paymentId });
}

/**
 * Finds a payment by its MongoDB Object ID.
 * @param {string} objectId 
 * @returns {Promise<object|null>}
 */
export async function findPaymentByObjectId(objectId) {
    return await Payment.findById(objectId);
}

/**
 * Retrieves all payments sorted by creation date.
 * @returns {Promise<Array>}
 */
export async function findAllPayments() {
    return await Payment.find().sort({ createdAt: -1 });
}

/**
 * Updates payment status and associated metadata.
 * @param {string} paymentId
 * @param {object} updateData
 * @returns {Promise<object>}
 */
export async function updatePaymentStatusInService(paymentId, updateData) {
    const { status, transactionId, cardLastFourDigits } = updateData;

    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
        throw new Error("Payment not found");
    }

    const previousPaymentStatus = payment.status;
    payment.status = status;
    if (transactionId !== undefined) {
        payment.transactionId = transactionId;
    }
    if (cardLastFourDigits !== undefined) {
        payment.cardLastFourDigits = cardLastFourDigits;
    }

    console.log("\n============================================\n[TEST LOG] updatePaymentStatusInService saving document. paymentId:", paymentId, "updateData:", updateData, "\nDocument to save:\n", payment, "\n============================================\n");
    await payment.save();
    try {
        await syncTransactionForPayment({
            payment,
            previousPaymentStatus,
            metadata: {
                channel: "payment-status-update",
            },
        });
    } catch (syncError) {
        payment.status = previousPaymentStatus;
        await payment.save();
        throw syncError;
    }
    return payment;
}
