import logging
from datetime import datetime
from database.mongodb_client import MongoDBClient

logger = logging.getLogger("fraud_detector")

class AlertHandler:
    def __init__(self):
        self.db = MongoDBClient().get_db()
        self.collection_name = "fraud_alerts"

    def handle_alert(self, transaction: dict, decision: dict):
        """
        Creates an alert and investigation case for BLOCKED transactions.
        """
        logger.info(f"Handling alert for blocked transaction: {transaction.get('transaction_id')}")
        
        alert_record = {
            "transaction_id": transaction.get("transaction_id"),
            "user_id": transaction.get("user_id"),
            "amount": transaction.get("amount"),
            "status": "OPEN", # Investigation status
            "decision": decision,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        # 1. Save to MongoDB
        if self.db is not None:
            try:
                self.db[self.collection_name].insert_one(alert_record)
                logger.debug("Alert saved to database successfully.")
            except Exception as e:
                logger.error(f"Failed to save alert to database: {e}")
        else:
            logger.warning("MongoDB not connected, skipping alert persistence.")

        # 2. In a real system, you might trigger emails or webhooks here
        self._send_notifications(alert_record)

    def _send_notifications(self, alert_record):
        # Placeholder for external notification logic (e.g., Slack, Email, SMS)
        logger.debug(f"Notification triggered for alert: {alert_record['transaction_id']}")
        pass
