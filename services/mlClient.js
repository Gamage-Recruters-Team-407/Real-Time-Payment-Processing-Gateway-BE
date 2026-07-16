import axios from 'axios';

export const mlClient = {
  predictFraud: async (transactionData) => {
    try {
      // Create payload matching Python model expectations (simplistic mapping based on transaction data)
      const payload = {
        amount: transactionData.amount,
        oldbalanceOrg: transactionData.oldbalanceOrg || transactionData.amount,
        newbalanceOrig: transactionData.newbalanceOrig || 0,
        oldbalanceDest: transactionData.oldbalanceDest || 0,
        newbalanceDest: transactionData.newbalanceDest || transactionData.amount,
        type_CASH_OUT: transactionData.type === 'CASH_OUT' ? 1 : 0,
        type_TRANSFER: transactionData.type === 'TRANSFER' ? 1 : 0
      };

      console.log('📤 Sending transaction to ML service...');
      const response = await axios.post('http://127.0.0.1:5000/predict', payload, {
        timeout: 2000 // 2 seconds timeout
      });

      console.log(`📥 ML Response:`, response.data);
      return {
        probability: response.data.probability,
        risk_score: response.data.risk_score
      };
    } catch (error) {
      console.error('❌ ML Service Error:', error.message);
      // Return null so riskScore.js uses fallback logic
      return null;
    }
  }
};