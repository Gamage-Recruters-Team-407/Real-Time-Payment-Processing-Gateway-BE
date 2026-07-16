import FraudLog from '../models/FraudLog.js';

export const regionalService = {
  getRegionalVelocity: async () => {
    const pipeline = [
      {
        $match: {
          location: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: "$location",
          totalTransactions: { $sum: 1 },
          fraudTransactions: {
            $sum: { $cond: [{ $in: ["$status", ["HIGH_RISK", "BLOCKED", "ESCALATED"]] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          name: "$_id",
          totalTransactions: 1,
          fraudTransactions: 1,
          fraudRate: { 
            $round: [{ $multiply: [{ $divide: ["$fraudTransactions", { $max: ["$totalTransactions", 1] }] }, 100] }, 1] 
          }
        }
      },
      { $sort: { fraudRate: -1 } }
    ];

    try {
      const results = await FraudLog.aggregate(pipeline);

      if (results.length === 0) {
        return getMockRegionalData();
      }

      const regions = results.map(r => {
        let riskLevel = 'LOW';
        if (r.fraudRate > 15) riskLevel = 'CRITICAL';
        else if (r.fraudRate > 8) riskLevel = 'HIGH';
        else if (r.fraudRate > 4) riskLevel = 'MEDIUM';

        return {
          name: r.name || 'Unknown',
          cluster: r.name || 'Unknown',
          riskLevel,
          fraudRate: r.fraudRate,
          totalTransactions: r.totalTransactions,
          fraudTransactions: r.fraudTransactions,
          trend: "STABLE",
          change: "+0.0%"
        };
      });

      const totalF = regions.reduce((acc, r) => acc + r.fraudTransactions, 0);
      const totalT = regions.reduce((acc, r) => acc + r.totalTransactions, 0);
      const globalFraudRate = totalT > 0 ? (totalF / totalT) * 100 : 0;

      return {
        regions,
        summary: {
          totalRegions: regions.length,
          highestRisk: regions.length > 0 ? regions[0].name : 'N/A',
          globalFraudRate: globalFraudRate.toFixed(1)
        }
      };
    } catch (e) {
      console.error("Aggregation error, returning mock:", e.message);
      return getMockRegionalData();
    }
  }
};

const getMockRegionalData = () => ({
  regions: [
      {
          name: "East Asia",
          cluster: "Hong Kong",
          riskLevel: "HIGH",
          fraudRate: 12.4,
          totalTransactions: 1540,
          fraudTransactions: 191,
          trend: "INCREASING",
          change: "+3.2%"
      },
      {
          name: "Eastern Europe",
          cluster: "Russia",
          riskLevel: "CRITICAL",
          fraudRate: 23.7,
          totalTransactions: 890,
          fraudTransactions: 211,
          trend: "STABLE",
          change: "+0.8%"
      },
      {
          name: "North America",
          cluster: "USA",
          riskLevel: "STABLE", // This maps to LOW / STABLE in UI
          fraudRate: 3.2,
          totalTransactions: 3200,
          fraudTransactions: 102,
          trend: "DECREASING",
          change: "-1.5%"
      }
  ],
  summary: {
      totalRegions: 3,
      highestRisk: "Eastern Europe",
      globalFraudRate: 8.7
  }
});
