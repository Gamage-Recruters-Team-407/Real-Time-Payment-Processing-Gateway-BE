import os
import joblib
import pandas as pd
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MLPredictor:
    def __init__(self, models_dir="models"):
        self.models_dir = models_dir
        self.model = None
        self.scaler = None
        self.feature_names = None
        self._load_models()

    def _load_models(self):
        import sys
        import os
        
        # Save original stderr
        original_stderr = sys.stderr
        
        try:
            # Redirect stderr to devnull to suppress C++ XGBoost warnings
            sys.stderr = open(os.devnull, 'w')
            
            model_path = os.path.join(self.models_dir, "model.pkl")
            scaler_path = os.path.join(self.models_dir, "scaler.pkl")
            features_path = os.path.join(self.models_dir, "feature_names.pkl")

            if os.path.exists(model_path):
                self.model = joblib.load(model_path)
            if os.path.exists(scaler_path):
                self.scaler = joblib.load(scaler_path)
            if os.path.exists(features_path):
                self.feature_names = joblib.load(features_path)
                
        except Exception as e:
            # Restore stderr and log warning
            sys.stderr = original_stderr
            logger.warning(f"Could not load ML models ({e}). The system will safely use the Rule Engine fallback.")
        finally:
            # Always restore original stderr
            if sys.stderr != original_stderr:
                sys.stderr.close()
                sys.stderr = original_stderr
            logger.info("ML Models loaded successfully (if present).")

    def _extract_features(self, transaction):
        # Fallback to dummy features if real features are not well defined
        # This mapping depends on what features the Colab model actually expects
        # We try to use feature_names if available, otherwise just use some defaults
        features = {
            "amount": transaction.get("amount", 0),
            "merchantRisk": transaction.get("merchantRisk", 0),
            "velocityCount": transaction.get("velocityCount", 0),
            "historyCount": transaction.get("historyCount", 10)
        }
        
        if self.feature_names:
            # Ensure all expected features are present
            for fn in self.feature_names:
                if fn not in features:
                    features[fn] = transaction.get(fn, 0)
            # Order features as expected by the model
            return pd.DataFrame([features])[self.feature_names]
        else:
            return pd.DataFrame([features])

    def predict(self, transaction):
        """
        Extracts features from transaction, scales them, and predicts fraud probability.
        Returns probability (0-1).
        """
        if not self.model:
            logger.warning("ML Model not loaded. Returning default probability 0.1")
            return 0.1

        try:
            df = self._extract_features(transaction)
            
            if self.scaler:
                # Need to handle feature names warning if any, but pandas usually handles it
                scaled_features = self.scaler.transform(df)
            else:
                scaled_features = df.values

            # Assuming model has predict_proba
            if hasattr(self.model, "predict_proba"):
                prob = self.model.predict_proba(scaled_features)[0][1] # Probability of positive class
            else:
                # If only predict is available
                pred = self.model.predict(scaled_features)[0]
                prob = 1.0 if pred == 1 else 0.0

            return float(prob)
        except Exception as e:
            logger.error(f"Error during prediction: {e}")
            return 0.5 # Return uncertain probability on error
