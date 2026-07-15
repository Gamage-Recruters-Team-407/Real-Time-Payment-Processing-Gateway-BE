# Python Fraud Detection Microservices

This repository contains the Python-based microservices for fraud detection. It acts as the "brain" of the fraud detection system, evaluating transactions asynchronously via Kafka.

## Architecture

1. **Fraud Detector (`main.py`)**: Subscribes to Kafka `transactions` topic, processes them, and publishes verdicts to `fraud_decisions`.
2. **Rule Engine**: Evaluates transactions against deterministic rules (velocity, amount, etc.).
3. **ML Predictor**: Uses an XGBoost model (via `model.pkl`) to identify complex patterns.
4. **Alert Handler**: Stores blocked transaction details in MongoDB.
5. **Feature Store**: Caches user behavior and transaction history in Redis for fast access.

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Make sure you place `model.pkl`, `scaler.pkl`, and `feature_names.pkl` in the `models/` directory.
3. Configure settings in `config/settings.py` or via environment variables (e.g., in a `.env` file).
4. Run the main worker:
   ```bash
   python main.py
   ```

Alternatively, use Docker:
```bash
docker-compose up -d
```
