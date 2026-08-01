// Default scenario — ships as the initial state per the handoff brief.
// Lands ~$553/mo month-1 cash flow.

export const defaultProperty = {
  price: 250000, downPct: 25, rate: 7.0, termYears: 30,
  rent: 2325, rentIncrease: 3, vacancy: 5, propTaxRate: 1.0,
  insurance: 100, hoa: 0, maintenance: 100, mgmtPct: 0,
  expenseGrowth: 2, appreciation: 3, closingReno: 6000, horizon: 10,
};

export const defaultMachine = { divYield: 4, divGrowth: 0, callPct: 2, stockAppr: 5 };

export const defaultRefi = { on: false, year: 7, ltv: 75, rate: 7.0, termYears: 30, costs: 5000, fixupPct: 50 };
