import logging
from services.fraud_detector import FraudDetector
from kafka.producer import FraudResultProducer
from kafka.consumer import TransactionConsumer

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    logger.info("Initializing Python Fraud Detection Microservice...")
    
    # 1. Initialize Fraud Detector (Rule Engine + ML)
    fraud_detector = FraudDetector(config_path="config/rules.json")
    
    # 2. Initialize Kafka Producer (sends verdicts)
    producer = FraudResultProducer()
    
    # 3. Initialize Kafka Consumer (receives transactions)
    consumer = TransactionConsumer(fraud_detector=fraud_detector, producer=producer)
    
    # 4. Start listening
    consumer.start_listening()

if __name__ == "__main__":
    main()
