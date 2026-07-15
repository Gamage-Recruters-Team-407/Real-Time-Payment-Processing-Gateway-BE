import json
from datetime import datetime

class RuleEngine:
    def __init__(self, config_path="config/rules.json"):
        with open(config_path, "r") as f:
            self.config = json.load(f)
        self.rules = self.config.get("rules", {})

    def evaluate(self, transaction):
        score = 0
        reasons = []

        # Rule 1: Velocity
        velocity_cfg = self.rules.get("velocity", {})
        if velocity_cfg.get("enabled"):
            tx_velocity = transaction.get("velocityCount", 0)
            if tx_velocity >= velocity_cfg.get("threshold", 5):
                score += velocity_cfg.get("points", 25)
                reasons.append(f"High velocity: {tx_velocity} transactions in recent window")

        # Rule 2: Amount
        amount_cfg = self.rules.get("amount", {})
        if amount_cfg.get("enabled"):
            amount = transaction.get("amount", 0)
            if amount > amount_cfg.get("threshold", 5000):
                score += amount_cfg.get("points", 20)
                reasons.append(f"High transaction amount: ${amount}")

        # Rule 3: Geographic
        geo_cfg = self.rules.get("geographic", {})
        if geo_cfg.get("enabled"):
            # Assume locationMismatch is provided by Node.js or calculated
            if transaction.get("locationMismatch", False):
                score += geo_cfg.get("points", 20)
                reasons.append("Geographic location mismatch detected")

        # Rule 4: Device
        device_cfg = self.rules.get("device", {})
        if device_cfg.get("enabled"):
            if transaction.get("unknownDevice", False):
                score += device_cfg.get("points", 20)
                reasons.append("Unknown or suspicious device used")

        # Rule 5: Merchant Risk
        merchant_cfg = self.rules.get("merchant", {})
        if merchant_cfg.get("enabled"):
            merchant_risk = transaction.get("merchantRisk", 0)
            if merchant_risk > merchant_cfg.get("risk_threshold", 80):
                score += merchant_cfg.get("points", 15)
                reasons.append(f"High risk merchant score: {merchant_risk}")

        # Rule 6: User History
        history_cfg = self.rules.get("user_history", {})
        if history_cfg.get("enabled"):
            history_count = transaction.get("historyCount", 100) # default high to avoid penalizing new users unless specified
            if history_count < history_cfg.get("history_threshold", 10):
                score += history_cfg.get("points", 15)
                reasons.append(f"Low user history count: {history_count}")

        # Rule 7: Time
        time_cfg = self.rules.get("time", {})
        if time_cfg.get("enabled"):
            tx_time_str = transaction.get("timestamp")
            if tx_time_str:
                try:
                    # Assuming ISO format or similar
                    tx_time = datetime.fromisoformat(tx_time_str.replace("Z", "+00:00"))
                    hour = tx_time.hour
                except ValueError:
                    hour = datetime.utcnow().hour
            else:
                hour = datetime.utcnow().hour
            
            if time_cfg.get("start_hour", 0) <= hour < time_cfg.get("end_hour", 5):
                score += time_cfg.get("points", 10)
                reasons.append(f"Transaction occurred during suspicious hours: {hour} AM")

        # Rule 8: Blacklist
        blacklist_cfg = self.rules.get("blacklist", {})
        if blacklist_cfg.get("enabled"):
            if transaction.get("blacklisted", False):
                score += blacklist_cfg.get("points", 30)
                reasons.append("User or entity is blacklisted")

        # Cap score at 100
        score = min(score, 100)
        
        return {
            "score": score,
            "reasons": reasons
        }
