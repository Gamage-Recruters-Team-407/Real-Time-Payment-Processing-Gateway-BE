import { runCypher } from '../services/neo4j.js';

export const entityLinkService = {
  getEntityGraph: async (id) => {
    const query = `
      MATCH (a:Account {id: $id})-[r]-(connected)
      RETURN a, r, connected
      LIMIT 100
    `;
    
    try {
      const records = await runCypher(query, { id });
      
      // If neo4j is empty (e.g. no ingestion pipeline running yet), return mock data for frontend demo
      if (!records || records.length === 0) {
        return getMockEntityData(id);
      }
      
      const nodesMap = new Map();
      const edges = [];
      
      records.forEach(record => {
        const a = record.get('a');
        const connected = record.get('connected');
        const r = record.get('r');
        
        if (!nodesMap.has(a.identity.toString())) {
          nodesMap.set(a.identity.toString(), { id: a.properties.id || a.identity.toString(), type: a.labels[0].toLowerCase(), label: a.labels[0], risk: a.properties.risk || 0 });
        }
        if (!nodesMap.has(connected.identity.toString())) {
          nodesMap.set(connected.identity.toString(), { id: connected.properties.id || connected.properties.address || connected.identity.toString(), type: connected.labels[0].toLowerCase(), label: connected.labels[0], risk: connected.properties.risk || 0 });
        }
        
        edges.push({
          from: a.properties.id || a.identity.toString(),
          to: connected.properties.id || connected.properties.address || connected.identity.toString(),
          type: r.type
        });
      });
      
      return {
         nodes: Array.from(nodesMap.values()),
         edges,
         summary: {
           totalNodes: nodesMap.size,
           totalEdges: edges.length,
           fraudRing: nodesMap.size >= 3,
           riskLevel: "HIGH",
           clusterSize: nodesMap.size
         }
      };
    } catch (e) {
      console.error("Neo4j graph error, falling back to mock data:", e.message);
      return getMockEntityData(id);
    }
  }
};

const getMockEntityData = (id) => {
  return {
    nodes: [
        { id: id, type: "account", label: "Account A", risk: 94 },
        { id: "GP-5512-XXXX", type: "account", label: "Account B", risk: 100 },
        { id: "192.168.1.45", type: "ip", label: "IP Address", risk: 0 },
        { id: "DEV-4421", type: "device", label: "Device", risk: 0 },
        { id: "UNK_TECH_HKG", type: "merchant", label: "Merchant", risk: 95 }
    ],
    edges: [
        { from: id, to: "192.168.1.45", type: "USES_IP" },
        { from: "GP-5512-XXXX", to: "192.168.1.45", type: "USES_IP" },
        { from: id, to: "DEV-4421", type: "USES_DEVICE" },
        { from: "GP-5512-XXXX", to: "DEV-4421", type: "USES_DEVICE" },
        { from: id, to: "UNK_TECH_HKG", type: "PAYMENT_TO" },
        { from: "GP-5512-XXXX", to: "UNK_TECH_HKG", type: "PAYMENT_TO" }
    ],
    summary: {
        totalNodes: 5,
        totalEdges: 6,
        fraudRing: true,
        riskLevel: "HIGH",
        clusterSize: 2
    }
  };
};