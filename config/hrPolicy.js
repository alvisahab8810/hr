export const HR_POLICY = {
  workingDaysPerMonth: 26,        // Fixed 26 days
  lunchPenaltyPerMinute: 5,       // ₹5 per minute over lunch break
  halfDaySalaryFraction: 0.5,     // 50% pay for half-day
  lateArrival: {
    graceTime: "10:10",           // Arrival cutoff time
    fines: [
      { count: 2, fine: 0 },      // Up to 2 late marks – No penalty
      { count: 3, fine: 500 },    // 3 late marks – ₹500 fine
      { count: 5, fine: 1500 },   // 4-5 late marks – ₹1,500 fine
      { count: 9, fine: 3500 },   // 6-9 late marks – ₹3,500 fine
      { count: Infinity, fine: 5000 }, // 10+ late marks – ₹5,000 fine
    ],
  },
};
