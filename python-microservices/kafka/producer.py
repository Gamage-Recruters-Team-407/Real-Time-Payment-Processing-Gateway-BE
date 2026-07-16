import json
import logging
from confluent_kafka import Producer
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FraudResultProducer:
    def __init__(self):
        # Allow configuration via environment variables
        bootstrap_servers = os.environ.get("KAFKA_BROKER", "localhost:9092")
        self.topic = os.environ.get("KAFKA_PRODUCER_TOPIC", "fraud_decisions")
        
        conf = {
            'bootstrap.servers': bootstrap_servers,
            'client.id': 'python-fraud-producer'
        }
        
        try:
            self.producer = Producer(conf)
            logger.info(f"Connected to Kafka Producer at {bootstrap_servers}")
        except Exception as e:
            logger.error(f"Failed to initialize Kafka Producer: {e}")
            self.producer = None

    def delivery_report(self, err, msg):
        """ Called once for each message produced to indicate delivery result. """
        if err is not None:
            logger.error(f'Message delivery failed: {err}')
        else:
            logger.debug(f'Message delivered to {msg.topic()} [{msg.partition()}]')

    def publish(self, result):
        if not self.producer:
            logger.error("Producer is not initialized. Cannot publish message.")
            return False
            
        try:
            # Convert result to JSON string and encode to bytes
            value = json.dumps(result).encode('utf-8')
            
            # Use transactionId as key if available, else None
            key = result.get("transactionId", "default_key").encode('utf-8')
            
            self.producer.produce(
                topic=self.topic,
                key=key,
                value=value,
                callback=self.delivery_report
            )
            
            # Poll to handle delivery callbacks
            self.producer.poll(0)
            logger.info(f"Published fraud decision for transaction: {result.get('transactionId')}")
            return True
        except Exception as e:
            logger.error(f"Error publishing message to Kafka: {e}")
            return False

    def flush(self):
        if self.producer:
            self.producer.flush()
