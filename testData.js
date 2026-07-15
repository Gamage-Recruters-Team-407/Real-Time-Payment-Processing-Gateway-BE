import axios from 'axios';

const transactions = [
  // 1. Normal Transaction (Low risk)
  {
    transactionId: 'TXN-' + Date.now() + '-1',
    userId: 'USER-001',
    amount: 25.50,
    merchant: 'Coffee Shop',
    ip: '192.168.1.10',
    deviceId: 'DEV-A1',
    location: 'US',
    type: 'PAYMENT'
  },
  // 2. High Amount Transaction (Rules engine triggered)
  {
    transactionId: 'TXN-' + Date.now() + '-2',
    userId: 'USER-002',
    amount: 15000.00,
    merchant: 'Luxury Watches',
    ip: '192.168.1.20',
    deviceId: 'DEV-B2',
    location: 'US',
    type: 'TRANSFER'
  },
  // 3. High Risk Merchant & Location
  {
    transactionId: 'TXN-' + Date.now() + '-3',
    userId: 'USER-003',
    amount: 450.00,
    merchant: 'CryptoExchange', 
    ip: '203.0.113.1',
    deviceId: 'DEV-C3',
    location: 'RU', 
    type: 'CASH_OUT'
  },
  // 4. ML Fraud Pattern (CASH_OUT with empty dest)
  {
    transactionId: 'TXN-' + Date.now() + '-4',
    userId: 'USER-004',
    amount: 50000.00,
    merchant: 'Unknown Service',
    ip: '198.51.100.5',
    deviceId: 'DEV-D4',
    location: 'NG',
    type: 'CASH_OUT',
    oldbalanceOrg: 50000,
    newbalanceOrig: 0,
    oldbalanceDest: 0,
    newbalanceDest: 0
  },
  // 5. Normal Transaction
  {
    transactionId: 'TXN-' + Date.now() + '-5',
    userId: 'USER-005',
    amount: 120.00,
    merchant: 'Grocery Store',
    ip: '192.168.1.50',
    deviceId: 'DEV-E5',
    location: 'CA',
    type: 'PAYMENT'
  }
];

async function run() {
  for (const t of transactions) {
    try {
      console.log(`Sending ${t.transactionId} (Amount: $${t.amount})...`);
      const res = await axios.post('http://127.0.0.1:5000/api/fraud/process', t);
      console.log(`Result: ${res.data.status} (Score: ${res.data.finalScore}) - ${res.data.reasons.join(', ')}`);
      await new Promise(r => setTimeout(r, 1000)); // wait 1s between requests
    } catch (err) {
      console.error(err.message);
    }
  }
}
run();
