export const calculateRisk = (ruleScore, mlScore = null) => {
  // Step 3 & 4: Combine scores
  // For Day 2, we just use ruleScore if mlScore is not provided
  let finalScore = ruleScore;

  if (mlScore !== null) {
    // For example, average them, or weight them.
    // For now, let's take the higher one or an average.
    finalScore = (ruleScore + mlScore) / 2;
  }

  // Step 5: Cap at 100
  finalScore = Math.min(Math.round(finalScore), 100);

  // Step 6: Determine Status
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