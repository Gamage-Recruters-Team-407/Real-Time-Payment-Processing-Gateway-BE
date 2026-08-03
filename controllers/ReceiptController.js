import PDFDocument from "pdfkit";
import Payment from "../models/Payment.js";

const SHOP_NAME =
  (process.env.SHOP_NAME ||
    process.env.SINGLE_SHOP_MERCHANT ||
    "Gamage Pay").trim();

const isAdminRole = (role) =>
  ["admin", "system administrator", "merchant administrator"].includes(
    String(role || "").trim().toLowerCase()
  );

const formatAmount = (amount, currency = "LKR") => {
  const numericAmount = Number(amount) || 0;

  return `${currency} ${numericAmount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (date) => {
  return new Date(date).toLocaleString("en-LK", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const addReceiptRow = (doc, label, value, yPosition) => {
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#64748b")
    .text(label, 60, yPosition);

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#0f172a")
    .text(String(value ?? "-"), 260, yPosition, {
      width: 275,
      align: "right",
    });
};

export const generatePaymentReceipt = async (req, res) => {
  try {
    const identifier = String(req.params.id || "").trim();

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required",
      });
    }

    /*
     * PaymentSuccess passes a human-readable transaction ID such as
     * TXN-78643427. The completed payment is stored in the Payment
     * collection, not necessarily in the Transaction collection.
     */
    const payment = await Payment.findOne({
      $or: [{ transactionId: identifier }, { paymentId: identifier }],
    }).lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment receipt not found",
      });
    }

    const loggedInUserId = req.user?.id || req.user?._id;
    const userIsAdmin = isAdminRole(req.user?.role);

    /*
     * Normal users can download only their own receipts.
     * Admin users can download any receipt.
     */
    if (
      !userIsAdmin &&
      (!loggedInUserId ||
        !payment.userId ||
        String(payment.userId) !== String(loggedInUserId))
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to download this receipt",
      });
    }

    if (payment.status !== "COMPLETED") {
      return res.status(409).json({
        success: false,
        message: "A receipt is available only for completed payments",
      });
    }

    const receiptId = payment.transactionId || payment.paymentId;
    const fileName = `receipt-${receiptId}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    res.setHeader("Cache-Control", "no-store");

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: `Payment Receipt - ${receiptId}`,
        Author: SHOP_NAME,
        Subject: "Payment Receipt",
      },
    });

    doc.pipe(res);

    // Header
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor("#059669")
      .text(SHOP_NAME, {
        align: "center",
      });

    doc
      .moveDown(0.3)
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#64748b")
      .text("Real-Time Payment Processing Gateway", {
        align: "center",
      });

    doc.moveDown(1.5);

    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor("#0f172a")
      .text("PAYMENT RECEIPT", {
        align: "center",
      });

    doc.moveDown(0.8);

    doc
      .font("Helvetica-Bold")
      .fontSize(28)
      .fillColor("#0f172a")
      .text(formatAmount(payment.amount, payment.currency), {
        align: "center",
      });

    doc.moveDown(0.4);

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#059669")
      .text("PAYMENT COMPLETED", {
        align: "center",
      });

    doc.moveDown(1.5);

    const startY = doc.y;

    doc
      .strokeColor("#e2e8f0")
      .lineWidth(1)
      .moveTo(55, startY)
      .lineTo(540, startY)
      .stroke();

    let currentY = startY + 25;

    addReceiptRow(doc, "Transaction ID", receiptId, currentY);
    currentY += 30;

    addReceiptRow(doc, "Payment ID", payment.paymentId, currentY);
    currentY += 30;

    addReceiptRow(
      doc,
      "Date and time",
      formatDate(payment.createdAt),
      currentY
    );
    currentY += 30;

    addReceiptRow(
      doc,
      "Payment method",
      `${payment.paymentMethod || "CARD"}${
        payment.cardLastFourDigits
          ? ` •••• ${payment.cardLastFourDigits}`
          : ""
      }`,
      currentY
    );
    currentY += 30;

    addReceiptRow(
      doc,
      "Currency",
      payment.currency || "LKR",
      currentY
    );
    currentY += 30;

    addReceiptRow(doc, "Status", payment.status, currentY);
    currentY += 30;

    if (payment.description) {
      addReceiptRow(doc, "Description", payment.description, currentY);
      currentY += 30;
    }

    doc
      .strokeColor("#e2e8f0")
      .moveTo(55, currentY)
      .lineTo(540, currentY)
      .stroke();

    currentY += 25;

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#64748b")
      .text("Amount paid", 60, currentY);

    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor("#0f172a")
      .text(
        formatAmount(payment.amount, payment.currency),
        260,
        currentY - 3,
        {
          width: 275,
          align: "right",
        }
      );

    doc
      .moveDown(5)
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#94a3b8")
      .text(
        "This is a system-generated receipt and does not require a signature.",
        {
          align: "center",
        }
      );

    doc
      .moveDown(0.5)
      .text(`Generated on ${formatDate(new Date())}`, {
        align: "center",
      });

    doc.end();
  } catch (error) {
    console.error("Generate receipt error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Unable to generate payment receipt",
      });
    }

    return res.end();
  }
};