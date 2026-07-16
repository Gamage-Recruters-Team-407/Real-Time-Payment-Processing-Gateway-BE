import json
import logging
from services.rule_engine import RuleEngine
from services.ml_predictor import MLPredictor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FraudDetector:
    def __init__(self, config_path="config/rules.json"):
        with open(config_path, "r") as f:
            config = json.load(f)
        
        self.decision_thresholds = config.get("decision_thresholds", {})
        self.rule_engine = RuleEngine(config_path)
        self.ml_predictor = MLPredictor()

    def evaluate(self, transaction):
        transaction_id = transaction.get("transactionId", transaction.get("id", "UNKNOWN"))
        logger.info(f"Evaluating transaction: {transaction_id}")

        # 1. Rule Engine Evaluation
        rule_result = self.rule_engine.evaluate(transaction)
        rule_score = rule_result["score"]
        reasons = rule_result["reasons"]

        # 2. Check direct Rule Engine thresholds
        block_threshold = self.decision_thresholds.get("block_threshold", 80)
        ml_threshold_low = self.decision_thresholds.get("ml_threshold_low", 20)
        
        if rule_score >= block_threshold:
            return self._build_result(transaction_id, "BLOCK", rule_score, None, None, reasons + ["Blocked by Rule Engine thresholds"])
        
        if rule_score <= ml_threshold_low:
            return self._build_result(transaction_id, "APPROVE", rule_score, None, None, reasons + ["Approved by Rule Engine (low risk)"])

        # 3. ML Model Prediction
        ml_probability = self.ml_predictor.predict(transaction)

        # 4. Combine Scores
        final_score = (rule_score / 100.0 * 0.4) + (ml_probability * 0.6)
        final_threshold = self.decision_thresholds.get("final_threshold", 0.55)

        if final_score >= final_threshold:
            verdict = "BLOCK"
            reasons.append("Blocked by combined Rule and ML score")
        else:
            verdict = "APPROVE"
            reasons.append("Approved by combined Rule and ML score")

        return self._build_result(transaction_id, verdict, rule_score, ml_probability, final_score, reasons)

    def _build_result(self, transaction_id, verdict, rule_score, ml_probability, final_score, reasons):
        return {
            "transactionId": transaction_id,
            "verdict": verdict,
            "rule_score": rule_score,
            "ml_probability": ml_probability,
            "final_score": final_score if final_score is not None else (rule_score / 100.0),
            "reasons": reasons
        }
