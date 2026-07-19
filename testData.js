import axios from 'axios';

const transactions = [
  // 1. Normal Transaction (Low risk - totally clean)
  {
    transactionId: 'TXN-' + Date.now() + '-1',
    userId: 'USER-001',
    amount: 25.50,
    merchant: 'Coffee Shop',
    ip: '192.168.1.10',
    deviceId: 'DEV-A1',
    type: 'PAYMENT'
  },
  // 2. Normal Transaction (Low risk - grocery)
  {
    transactionId: 'TXN-' + Date.now() + '-2',
    userId: 'USER-002',
    amount: 150.00,
    merchant: 'Grocery Store',
    ip: '192.168.1.15',
    deviceId: 'DEV-A2',
    type: 'PAYMENT'
  },
  // 3. Medium Risk Transaction (Unusual location or IP velocity)
  {
    transactionId: 'TXN-' + Date.now() + '-3',
    userId: 'USER-003',
    amount: 450.00,
    merchant: 'Online Electronics',
    ip: '45.22.12.5',
    deviceId: 'DEV-A3',
    type: 'PAYMENT'
  },
  // History for USER-004
  {
    transactionId: 'TXN-' + (Date.now() - 100000) + '-4',
    userId: 'USER-004',
    amount: 25.00,
    merchant: 'Coffee Shop',
    ip: '192.168.1.10',
    deviceId: 'DEV-A1',
    type: 'PAYMENT'
  },
  {
    transactionId: 'TXN-' + (Date.now() - 50000) + '-4',
    userId: 'USER-004',
    amount: 45.00,
    merchant: 'Book Store',
    ip: '192.168.1.10',
    deviceId: 'DEV-A1',
    type: 'PAYMENT'
  },
  {
    transactionId: 'TXN-' + (Date.now() - 10000) + '-4',
    userId: 'USER-004',
    amount: 15.00,
    merchant: 'Coffee Shop',
    ip: '192.168.1.10',
    deviceId: 'DEV-A1',
    type: 'PAYMENT'
  },
  // 4. Medium Risk Transaction (High value for typical profile)
  {
    transactionId: 'TXN-' + Date.now() + '-4',
    userId: 'USER-004',
    amount: 850.00,
    merchant: 'Flight Tickets',
    ip: '192.168.1.10',
    deviceId: 'DEV-A1',
    type: 'PAYMENT'
  },
  // History for USER-005
  {
    transactionId: 'TXN-' + (Date.now() - 200000) + '-5',
    userId: 'USER-005',
    amount: 1200.00,
    merchant: 'Luxury Watches',
    ip: '198.51.100.12',
    deviceId: 'DEV-B2',
    type: 'PAYMENT'
  },
  {
    transactionId: 'TXN-' + (Date.now() - 150000) + '-5',
    userId: 'USER-005',
    amount: 300.00,
    merchant: 'Boutique',
    ip: '198.51.100.12',
    deviceId: 'DEV-B2',
    type: 'PAYMENT'
  },
  // 5. Automatically Blocked Transaction (Flagged by ML / High Amount)
  {
    transactionId: 'TXN-' + Date.now() + '-5',
    userId: 'USER-005',
    amount: 15000.00,
    merchant: 'Luxury Watches',
    ip: '198.51.100.12',
    deviceId: 'DEV-B2',
    type: 'TRANSFER'
  },
  // 6. Blocked Transaction (Blacklisted IP / Known Fraud)
  {
    transactionId: 'TXN-' + Date.now() + '-6',
    userId: 'USER-006',
    amount: 50000.00,
    merchant: 'Unknown Crypto Service',
    ip: '203.0.113.55',
    deviceId: 'DEV-C3',
    type: 'TRANSFER'
  },
  // 7. High Risk Transaction (Requires investigation)
  {
    transactionId: 'TXN-' + Date.now() + '-7',
    userId: 'USER-007',
    amount: 320.00,
    merchant: 'Gaming Credits',
    ip: '192.168.1.100',
    deviceId: 'DEV-D4',
    type: 'PAYMENT'
  },
  // 8. Normal Transaction (Low risk)
  {
    transactionId: 'TXN-' + Date.now() + '-8',
    userId: 'USER-008',
    amount: 15.00,
    merchant: 'Streaming Service',
    ip: '192.168.1.45',
    deviceId: 'DEV-E5',
    type: 'PAYMENT'
  },
  // 9. Blocked (Entity link analysis - associated with fraud ring)
  {
    transactionId: 'TXN-' + Date.now() + '-9',
    userId: 'USER-009',
    amount: 1200.00,
    merchant: 'Gift Cards Online',
    ip: '203.0.113.55', // Same IP as blocked USER-006
    deviceId: 'DEV-C3', // Same device as USER-006
    type: 'PAYMENT'
  },
  // 10. High Risk (New Account large transfer)
  {
    transactionId: 'TXN-' + Date.now() + '-10',
    userId: 'USER-010',
    amount: 4500.00,
    merchant: 'P2P Transfer',
    ip: '8.8.8.8',
    deviceId: 'DEV-F6',
    type: 'TRANSFER'
  }
];

async function seedData() {
  console.log('Sending test transactions to the API...');
  for (const t of transactions) {
    try {
      console.log(`Sending ${t.transactionId} (Amount: $${t.amount})...`);
      const res = await axios.post('http://localhost:5000/api/fraud/process', t);
      console.log(`Result: ${res.data.status} (Score: ${res.data.riskScore})`);
      await new Promise(r => setTimeout(r, 500)); // wait 0.5s between requests
    } catch (err) {
      console.error(err.message);
    }
  }
  console.log('Test data generation complete!');
}

seedData();
