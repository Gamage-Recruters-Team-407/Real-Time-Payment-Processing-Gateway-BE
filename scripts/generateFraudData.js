import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fraudService } from '../services/fraudService.js';

dotenv.config();

const users = ['USER-101', 'USER-102', 'USER-103', 'USER-104', 'USER-105'];
const merchants = ['Tech Hub', 'SuperMart', 'Gadget World', 'Fresh Groceries', 'Cafe Bean'];
const ips = ['192.168.1.1', '10.0.0.5', '172.16.0.2', '8.8.8.8', '45.22.1.3'];
const devices = ['DEV-001', 'DEV-002', 'DEV-003', 'DEV-004', 'DEV-005'];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getAmount = () => Math.floor(Math.random() * 5000) + 10;

async function generateData() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not configured');
  }

  await mongoose.connect(process.env.MONGO_URI);
  
  console.log('Generating 15 fake transactions...');
  
  for (let i = 1; i <= 15; i++) {
    const tx = {
      transactionId: `TXN-GEN-${Date.now()}-${i}`,
      userId: getRandom(users),
      amount: getAmount(),
      merchant: getRandom(merchants),
      ip: getRandom(ips),
      deviceId: getRandom(devices)
    };
    
    // To trigger different risk scores, occasionally force high amount or strange IP
    if (i % 5 === 0) {
      tx.amount = 15000 + getAmount();
      tx.ip = '103.44.2.1'; // sketchy IP
    }

    try {
      await fraudService.processTransaction(tx);
      console.log(`Processed ${tx.transactionId}`);
    } catch (err) {
      console.error(`Failed to process ${tx.transactionId}:`, err.message);
    }
  }

  console.log('Finished generating transactions.');
  await mongoose.connection.close();
}

generateData().catch(console.error);
