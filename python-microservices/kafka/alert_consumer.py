import json
import logging
from confluent_kafka import Consumer, KafkaError
import os
import threading

logger = logging.getLogger(__name__)

class AlertConsumer(threading.Thread):
    def __init__(self, alert_handler):
        super().__init__()
        self.daemon = True
        self.alert_handler = alert_handler
        
        bootstrap_servers = os.environ.get("KAFKA_BROKER", "localhost:9092")
        self.topic = os.environ.get("KAFKA_PRODUCER_TOPIC", "fraud_decisions")
        
        conf = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': 'python-alert-handler-group',
            'auto.offset.reset': 'earliest'
        }
        
        try:
            self.consumer = Consumer(conf)
            self.consumer.subscribe([self.topic])
            logger.info(f"Connected to Kafka Alert Consumer at {bootstrap_servers}, listening to topic '{self.topic}'")
        except Exception as e:
            logger.error(f"Failed to initialize Kafka Alert Consumer: {e}")
            self.consumer = None

    def run(self):
        if not self.consumer:
            logger.error("Alert Consumer not initialized. Exiting thread.")
            return

        logger.info("Starting Kafka Alert consumer loop...")
        try:
            while True:
                msg = self.consumer.poll(timeout=1.0)
                
                if msg is None:
                    continue
                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        continue
                    else:
                        logger.error(f"Kafka error in Alert Consumer: {msg.error()}")
                        break

                try:
                    val = msg.value().decode('utf-8')
                    decision_data = json.loads(val)
                    
                    status = decision_data.get('status')
                    if status in ['HIGH_RISK', 'BLOCKED', 'CLEARED']:
                        transaction = {
                            "transaction_id": decision_data.get("transactionId", "UNKNOWN"),
                            "user_id": decision_data.get("userId", "UNKNOWN"),
                            "amount": decision_data.get("amount", 0)
                        }
                        
                        self.alert_handler.handle_alert(transaction, decision_data)
                        
                except json.JSONDecodeError:
                    logger.error(f"Failed to decode JSON message in alert consumer: {msg.value()}")
                except Exception as e:
                    logger.error(f"Error processing alert message: {e}")
                    
        except KeyboardInterrupt:
            logger.info("Alert Consumer stopped.")
        finally:
            self.consumer.close()
