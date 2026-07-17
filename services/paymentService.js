import Payment from '../models/Payment.js';
import { validateCardDetails } from '../utils/validateCard.js';
import { createNotification } from './notificationService.js';

/**
 * Processes a card payment.
 * @param {object} paymentData 
 * @returns {Promise<object>}
 */
export async function processCardPayment(paymentData) {
    const { userId, amount, cardDetails } = paymentData;

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
                status: "COMPLETED",
                transactionId: generatedTransactionId
            });
            // DB Save disabled for testing per user request:
            // await payment.save();
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
                amount: Number(amount)
            };
        } else {
            // MongoDB not connected (fallback)
            console.warn("MongoDB connection offline. Falling back to simulated card processing success.");
            return {
                success: true,
                message: "Payment processed successfully (Simulated - DB offline)",
                paymentId: paymentData.paymentId || `PAY-MOCK-${Date.now()}`,
                transactionId: generatedTransactionId,
                referenceNo: generatedReferenceNo,
                amount: Number(amount)
            };
        }
    } catch (err) {
        console.error("paymentService database error caught, falling back to simulated success:", err.message);
        return {
            success: true,
            message: `Payment processed successfully (Simulated - Error: ${err.message})`,
            paymentId: paymentData.paymentId || `PAY-MOCK-${Date.now()}`,
            transactionId: generatedTransactionId,
            referenceNo: generatedReferenceNo,
            amount: Number(amount)
        };
    }
}
