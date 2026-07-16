import json
import warnings
import logging
import os
from flask import Flask, request, jsonify
from services.fraud_detector import FraudDetector

# Suppress all warnings to keep terminal clean
warnings.filterwarnings("ignore")
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)

try:
    # Initialize single instance of FraudDetector for the API
    fraud_detector = FraudDetector(config_path="config/rules.json")
    
    print("\n" + "="*50)
    print("✅ Rule engine initialized successfully.")
    
    # Check if ML model actually loaded successfully
    if fraud_detector.ml_predictor.model is not None:
        print("✅ ML service running successfully.")
    else:
        print("⚠️ ML models not found or failed to load. Using Rule Engine fallback.")
        
    print("🚀 Fraud Detection API is listening on http://0.0.0.0:5005")
    print("="*50 + "\n")
    
except Exception as e:
    print("\n" + "="*50)
    print(f"❌ ERROR: Failed to start Rule Engine or Fraud Detector: {e}")
    print("="*50 + "\n")
    import sys
    sys.exit(1)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "python-fraud-detection"}), 200

@app.route('/predict', methods=['POST'])
def predict():
    """Direct fraud detection endpoint (bypassing Kafka)"""
    try:
        transaction = request.get_json()
        if not transaction:
            return jsonify({"error": "Invalid JSON or missing payload"}), 400
            
        result = fraud_detector.evaluate(transaction)
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/config', methods=['GET', 'POST'])
def handle_config():
    """View or update rules configuration"""
    config_path = "config/rules.json"
    
    if request.method == 'GET':
        try:
            with open(config_path, "r") as f:
                config = json.load(f)
            return jsonify(config), 200
        except Exception as e:
            return jsonify({"error": f"Failed to read config: {str(e)}"}), 500
            
    elif request.method == 'POST':
        try:
            new_config = request.get_json()
            if not new_config or "rules" not in new_config:
                return jsonify({"error": "Invalid configuration payload"}), 400
                
            # Update the file
            with open(config_path, "w") as f:
                json.dump(new_config, f, indent=4)
                
            # Reload the FraudDetector with new config
            global fraud_detector
            fraud_detector = FraudDetector(config_path=config_path)
            
            return jsonify({"message": "Configuration updated successfully", "config": new_config}), 200
        except Exception as e:
            return jsonify({"error": f"Failed to update config: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5005, debug=False)
