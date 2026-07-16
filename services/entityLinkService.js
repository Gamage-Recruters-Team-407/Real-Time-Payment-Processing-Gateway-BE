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
      
      if (!records || records.length === 0) {
        return {
          nodes: [],
          edges: [],
          summary: { totalNodes: 0, totalEdges: 0, fraudRing: false, riskLevel: "LOW", clusterSize: 0 }
        };
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
      console.error("Neo4j graph error:", e.message);
      return {
         nodes: [],
         edges: [],
         summary: { totalNodes: 0, totalEdges: 0, fraudRing: false, riskLevel: "LOW", clusterSize: 0 }
      };
    }
  }
};
