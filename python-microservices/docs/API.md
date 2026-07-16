# API Documentation

## Kafka Interface

The Python microservices primarily communicate via Kafka.

### Transactions Topic (Input)
**Topic name:** `transactions`

**Message Format:**
```json
{
  "transaction_id": "tx_12345",
  "user_id": "usr_987",
  "amount": 1500.00,
  "location": "US-NY",
  "device_id": "dev_abc123",
  "merchant_id": "mch_555",
  "merchant_risk_score": 25,
  "timestamp": "2023-10-27T10:00:00Z",
  "type": "PAYMENT"
}
```

### Fraud Decisions Topic (Output)
**Topic name:** `fraud_decisions`

**Message Format:**
```json
{
  "transaction_id": "tx_12345",
  "status": "APPROVE", // or "BLOCK"
  "rule_score": 15,
  "ml_probability": 0.12,
  "final_score": 0.132,
  "reason": "Approved by combined Rule and ML score"
}
```

## REST API (Optional)

If `app.py` is running, the following endpoints are available:

### `GET /health`
Returns the health status of the service.

### `POST /api/v1/evaluate`
Synchronously evaluates a transaction (useful for testing or fallback).
**Request Body:** Same as the transaction topic message format.
**Response:** Same as the fraud decision topic message format.
