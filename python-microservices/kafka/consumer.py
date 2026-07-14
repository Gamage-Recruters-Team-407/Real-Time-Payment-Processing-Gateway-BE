import json
import logging
from confluent_kafka import Consumer, KafkaError
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TransactionConsumer:
    def __init__(self, fraud_detector, producer):
        self.fraud_detector = fraud_detector
        self.producer = producer
        
        bootstrap_servers = os.environ.get("KAFKA_BROKER", "localhost:9092")
        self.topic = os.environ.get("KAFKA_CONSUMER_TOPIC", "transactions")
        
        conf = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': 'python-fraud-consumer-group',
            'auto.offset.reset': 'earliest'
        }
        
        try:
            self.consumer = Consumer(conf)
            self.consumer.subscribe([self.topic])
            logger.info(f"Connected to Kafka Consumer at {bootstrap_servers}, listening to topic '{self.topic}'")
        except Exception as e:
            logger.error(f"Failed to initialize Kafka Consumer: {e}")
            self.consumer = None

    def start_listening(self):
        if not self.consumer:
            logger.error("Consumer not initialized. Exiting.")
            return

        logger.info("Starting Kafka consumer loop...")
        try:
            while True:
                msg = self.consumer.poll(timeout=1.0)
                
                if msg is None:
                    continue
                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        # End of partition event
                        continue
                    else:
                        logger.error(f"Kafka error: {msg.error()}")
                        break

                try:
                    # Parse message
                    val = msg.value().decode('utf-8')
                    transaction_data = json.loads(val)
                    logger.info(f"Received transaction: {transaction_data.get('transactionId', 'UNKNOWN')}")
                    
                    # 1. Evaluate transaction
                    result = self.fraud_detector.evaluate(transaction_data)
                    
                    # 2. Publish result
                    self.producer.publish(result)
                    
                except json.JSONDecodeError:
                    logger.error(f"Failed to decode JSON message: {msg.value()}")
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
                    
        except KeyboardInterrupt:
            logger.info("Consumer stopped by user.")
        finally:
            self.consumer.close()
            self.producer.flush()
