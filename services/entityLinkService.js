import FraudLog from '../models/FraudLog.js';

export const entityLinkService = {
  getEntityGraph: async (id) => {
    try {
      let seedId = id;
      
      // If default ID, try to get the most recent transaction's user
      if (seedId === 'USER-DEFAULT') {
        const recentTx = await FraudLog.findOne().sort({ createdAt: -1 });
        if (recentTx) {
          seedId = recentTx.userId;
        }
      }

      // Find all transactions associated with this user ID
      let transactions = await FraudLog.find({ userId: seedId });
      
      if (!transactions || transactions.length === 0) {
        // Fallback: just try to get the latest transaction from any user
        const recentTx = await FraudLog.findOne().sort({ createdAt: -1 });
        if (recentTx) {
          seedId = recentTx.userId;
          transactions = await FraudLog.find({ userId: seedId });
        }
        
        // If still empty, return default empty state
        if (!transactions || transactions.length === 0) {
          return {
            nodes: [],
            edges: [],
            summary: { totalNodes: 0, totalEdges: 0, fraudRing: false, riskLevel: "LOW", clusterSize: 0 },
            seedId: null
          };
        }
      }
      
      const nodesMap = new Map();
      const edges = [];
      
      // Central Node: The Account (User)
      const accountNodeId = seedId;
      nodesMap.set(accountNodeId, { id: accountNodeId, type: "account", label: "Account", risk: 0 });
      
      transactions.forEach(tx => {
        // IP Node
        if (tx.ip && tx.ip !== 'Unknown') {
          if (!nodesMap.has(tx.ip)) {
            nodesMap.set(tx.ip, { id: tx.ip, type: "ip", label: "Ip", risk: 0 });
          }
          // Only add edge if it doesn't already exist to prevent duplicates
          if (!edges.some(e => e.from === accountNodeId && e.to === tx.ip && e.type === "USES_IP")) {
            edges.push({ from: accountNodeId, to: tx.ip, type: "USES_IP" });
          }
        }
        
        // Device Node
        if (tx.deviceId && tx.deviceId !== 'Unknown') {
          if (!nodesMap.has(tx.deviceId)) {
            nodesMap.set(tx.deviceId, { id: tx.deviceId, type: "device", label: "Device", risk: 0 });
          }
          if (!edges.some(e => e.from === accountNodeId && e.to === tx.deviceId && e.type === "USES_DEVICE")) {
            edges.push({ from: accountNodeId, to: tx.deviceId, type: "USES_DEVICE" });
          }
        }
        
        // Merchant Node
        if (tx.merchant && tx.merchant !== 'Unknown') {
          if (!nodesMap.has(tx.merchant)) {
            nodesMap.set(tx.merchant, { id: tx.merchant, type: "merchant", label: "Merchant", risk: 0 });
          }
          if (!edges.some(e => e.from === accountNodeId && e.to === tx.merchant && e.type === "PAYMENT_TO")) {
            edges.push({ from: accountNodeId, to: tx.merchant, type: "PAYMENT_TO" });
          }
        }
        
        // Transaction Node
        if (tx.transactionId) {
          if (!nodesMap.has(tx.transactionId)) {
            nodesMap.set(tx.transactionId, { id: tx.transactionId, type: "transaction", label: "Transaction", risk: 0 });
          }
          if (!edges.some(e => e.from === accountNodeId && e.to === tx.transactionId && e.type === "PERFORMED")) {
            edges.push({ from: accountNodeId, to: tx.transactionId, type: "PERFORMED" });
          }
        }
      });
      
      const nodes = Array.from(nodesMap.values());
      
      return {
         nodes,
         edges,
         summary: {
           totalNodes: nodes.length,
           totalEdges: edges.length,
           fraudRing: nodes.length >= 3, // Simplistic fraud ring logic matching previous behavior
           riskLevel: "HIGH",
           clusterSize: nodes.length
         },
         seedId: accountNodeId
      };
    } catch (e) {
      console.error("MongoDB entity link graph error:", e.message);
      return {
         nodes: [],
         edges: [],
         summary: { totalNodes: 0, totalEdges: 0, fraudRing: false, riskLevel: "LOW", clusterSize: 0 }
      };
    }
  }
};
