# API Documentation

## REST API

The Python microservices communicate via REST API. The main endpoint is `/predict`.

### `GET /health`
Returns the health status of the service.

### `POST /predict`
Synchronously evaluates a transaction for fraud.

**Request Body:**
```json
{
  "transactionId": "tx_12345",
  "userId": "usr_987",
  "amount": 1500.00,
  "location": "US-NY",
  "deviceId": "dev_abc123",
  "merchant": "mch_555",
  "merchant_risk_score": 25,
  "timestamp": "2023-10-27T10:00:00Z",
  "type": "PAYMENT"
}
```

**Response:**
```json
{
  "ml_probability": 0.12,
  "final_score": 0.132,
  "reason": "Approved by combined Rule and ML score"
}
```
