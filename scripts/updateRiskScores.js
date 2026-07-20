import dotenv from "dotenv";
import mongoose from "mongoose";
import FraudLog from "../models/FraudLog.js";

dotenv.config({ path: "./.env" });

async function update() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  const result = await FraudLog.updateMany(
    { riskScore: 0 },
    { $set: { riskScore: 12 } }
  );
  
  // also fix any where status is wrong based on new thresholds
  // < 50 should be LOW_RISK
  await FraudLog.updateMany(
    { riskScore: { $lt: 50 }, status: { $ne: 'LOW_RISK' } },
    { $set: { status: 'LOW_RISK' } }
  );

  console.log(`Updated ${result.modifiedCount} transactions to have a baseline risk score.`);
}

update()
  .catch((error) => {
    console.error("Failed to update transactions:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
