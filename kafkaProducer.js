import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
dotenv.config();

const kafka = new Kafka({
  clientId: 'nodejs-fraud-producer',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();

let isConnected = false;

export const initKafkaProducer = async () => {
  try {
    await producer.connect();
    isConnected = true;
    console.log('[Kafka] Producer connected successfully');
  } catch (error) {
    console.error('[Kafka] Failed to connect producer:', error);
  }
};

export const publishTransaction = async (transaction) => {
  if (!isConnected) {
    console.warn('[Kafka] Producer not connected, attempting to connect...');
    await initKafkaProducer();
  }
  
  try {
    await producer.send({
      topic: process.env.KAFKA_PRODUCER_TOPIC || 'transactions',
      messages: [
        { 
          key: transaction.transactionId, 
          value: JSON.stringify(transaction) 
        }
      ],
    });
    console.log(`[Kafka] Published transaction ${transaction.transactionId} to topic`);
    return true;
  } catch (error) {
    console.error('[Kafka] Error publishing transaction:', error);
    return false;
  }
};
