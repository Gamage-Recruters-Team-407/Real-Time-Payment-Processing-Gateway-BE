export const calculateRisk = (ruleScore, mlScore = null) => {
  let finalScore = ruleScore;

  if (mlScore !== null) {
    // Weighted formula: 40% Rule Score, 60% ML Score
    finalScore = (ruleScore * 0.4) + (mlScore * 0.6);
  }

  // Cap at 100
  finalScore = Math.min(Math.round(finalScore), 100);

  // Determine Status
  let status = 'CLEARED';
  
  if (finalScore > 80) {
    status = 'HIGH_RISK';
    if (finalScore === 100) {
      status = 'BLOCKED';
    }
  } else if (finalScore >= 41) {
    status = 'REVIEW';
  }

  return { finalScore, status };
};