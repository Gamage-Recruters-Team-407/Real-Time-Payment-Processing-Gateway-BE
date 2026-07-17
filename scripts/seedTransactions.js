import dotenv from "dotenv";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";

dotenv.config({ path: "./.env" });

const merchantName =
  (process.env.SINGLE_SHOP_MERCHANT || process.env.SHOP_NAME || "Main Shop").trim();

const seedTransactions = [
  {
    transactionId: "TXN-SEED-1001",
    merchantName,
    customerName: "Nimal Perera",
    customerEmail: "nimal.perera@example.com",
    amount: 4500,
    currency: "LKR",
    paymentMethod: "Visa",
    status: "Successful",
    paymentReference: "PAY-SEED-1001",
    description: "Monthly grocery purchase",
    metadata: { terminalId: "POS-01", channel: "Card Present" },
    lifecycleHistory: [
      {
        status: "Pending",
        previousStatus: null,
        changedAt: new Date("2026-07-10T08:21:00.000Z"),
        reason: "Payment request received",
      },
      {
        status: "Processing",
        previousStatus: "Pending",
        changedAt: new Date("2026-07-10T08:22:10.000Z"),
        reason: "Gateway authorized the transaction",
      },
      {
        status: "Successful",
        previousStatus: "Processing",
        changedAt: new Date("2026-07-10T08:24:30.000Z"),
        reason: "Funds captured successfully",
      },
    ],
    createdAt: new Date("2026-07-10T08:21:00.000Z"),
    updatedAt: new Date("2026-07-10T08:24:30.000Z"),
  },
  {
    transactionId: "TXN-SEED-1002",
    merchantName,
    customerName: "Ayesha Ali",
    customerEmail: "ayesha.ali@example.com",
    amount: 12850,
    currency: "LKR",
    paymentMethod: "MasterCard",
    status: "Processing",
    paymentReference: "PAY-SEED-1002",
    description: "Online device purchase",
    metadata: { terminalId: "WEB-12", channel: "E-Commerce" },
    lifecycleHistory: [
      {
        status: "Pending",
        previousStatus: null,
        changedAt: new Date("2026-07-10T10:10:00.000Z"),
        reason: "Payment request received",
      },
      {
        status: "Processing",
        previousStatus: "Pending",
        changedAt: new Date("2026-07-10T10:11:25.000Z"),
        reason: "Awaiting bank confirmation",
      },
    ],
    createdAt: new Date("2026-07-10T10:10:00.000Z"),
    updatedAt: new Date("2026-07-10T10:11:25.000Z"),
  },
  {
    transactionId: "TXN-SEED-1003",
    merchantName,
    customerName: "Mohamed Shiraz",
    customerEmail: "shiraz@example.com",
    amount: 22000,
    currency: "LKR",
    paymentMethod: "Bank Transfer",
    status: "Failed",
    paymentReference: "PAY-SEED-1003",
    description: "Hotel booking payment",
    metadata: { terminalId: "MOB-08", channel: "Mobile App" },
    lifecycleHistory: [
      {
        status: "Pending",
        previousStatus: null,
        changedAt: new Date("2026-07-09T14:00:00.000Z"),
        reason: "Payment request received",
      },
      {
        status: "Failed",
        previousStatus: "Pending",
        changedAt: new Date("2026-07-09T14:00:40.000Z"),
        reason: "Insufficient balance",
      },
    ],
    createdAt: new Date("2026-07-09T14:00:00.000Z"),
    updatedAt: new Date("2026-07-09T14:00:40.000Z"),
  },
  {
    transactionId: "TXN-SEED-1004",
    merchantName,
    customerName: "Dinesh Fernando",
    customerEmail: "dinesh.fernando@example.com",
    amount: 3650,
    currency: "LKR",
    paymentMethod: "Visa",
    status: "Cancelled",
    paymentReference: "PAY-SEED-1004",
    description: "Medicine order cancellation",
    metadata: { terminalId: "POS-04", channel: "Card Present" },
    lifecycleHistory: [
      {
        status: "Pending",
        previousStatus: null,
        changedAt: new Date("2026-07-08T09:30:00.000Z"),
        reason: "Payment request received",
      },
      {
        status: "Cancelled",
        previousStatus: "Pending",
        changedAt: new Date("2026-07-08T09:34:18.000Z"),
        reason: "Customer cancelled before settlement",
      },
    ],
    createdAt: new Date("2026-07-08T09:30:00.000Z"),
    updatedAt: new Date("2026-07-08T09:34:18.000Z"),
  },
  {
    transactionId: "TXN-SEED-1005",
    merchantName,
    customerName: "Anushka Silva",
    customerEmail: "anushka.silva@example.com",
    amount: 18700,
    currency: "LKR",
    paymentMethod: "Apple Pay",
    status: "Successful",
    paymentReference: "PAY-SEED-1005",
    description: "Software license renewal",
    metadata: { terminalId: "WEB-31", channel: "E-Commerce" },
    lifecycleHistory: [
      {
        status: "Pending",
        previousStatus: null,
        changedAt: new Date("2026-07-07T16:45:00.000Z"),
        reason: "Payment request received",
      },
      {
        status: "Processing",
        previousStatus: "Pending",
        changedAt: new Date("2026-07-07T16:45:40.000Z"),
        reason: "Gateway authorization in progress",
      },
      {
        status: "Successful",
        previousStatus: "Processing",
        changedAt: new Date("2026-07-07T16:46:08.000Z"),
        reason: "Funds captured successfully",
      },
    ],
    createdAt: new Date("2026-07-07T16:45:00.000Z"),
    updatedAt: new Date("2026-07-07T16:46:08.000Z"),
  },
];

async function seed() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  const operations = seedTransactions.map((transaction) => ({
    updateOne: {
      filter: { transactionId: transaction.transactionId },
      update: { $set: transaction },
      upsert: true,
    },
  }));

  const result = await Transaction.bulkWrite(operations, { ordered: false });
  const total = await Transaction.countDocuments({
    transactionId: { $in: seedTransactions.map((transaction) => transaction.transactionId) },
  });

  console.log(
    `Seed complete. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}, Upserted: ${result.upsertedCount}, Available seeded records: ${total}`
  );
}

seed()
  .catch((error) => {
    console.error("Failed to seed transactions:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
