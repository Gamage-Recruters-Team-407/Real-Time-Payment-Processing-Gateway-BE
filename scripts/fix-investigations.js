import mongoose from 'mongoose';
import FraudLog from './models/FraudLog.js';
import Investigation from './models/Investigation.js';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fraud_detection_gateway');
  const investigations = await Investigation.find({});
  for (const inv of investigations) {
    await FraudLog.updateOne(
      { transactionId: inv.transactionId },
      { $set: { 'investigation.caseId': inv.caseId } }
    );
  }
  console.log(`Updated ${investigations.length} fraud logs.`);
  mongoose.connection.close();
};

run().catch(console.error);
