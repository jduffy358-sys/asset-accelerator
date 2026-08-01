// Finance engine for the Cash-Flow Machine analyzer.
// Ported verbatim from AssetAccelerator_Analyzer.jsx — do not change the math.
// All figures pre-tax. See CashFlowMachine_ClaudeCode_Handoff.md for the model spec.

export function computeProperty(pRaw, refiRaw) {
  const num = (v) => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };
  const p = {}; for (const k in pRaw) p[k] = num(pRaw[k]);
  p.termYears = Math.max(1, p.termYears);
  p.horizon = Math.min(40, Math.max(1, Math.round(p.horizon)));
  const refi = refiRaw && refiRaw.on ? {
    on: true,
    year: Math.min(p.horizon, Math.max(2, Math.round(num(refiRaw.year)))),
    ltv: num(refiRaw.ltv),
    rate: num(refiRaw.rate),
    termYears: Math.max(1, num(refiRaw.termYears)),
    costs: num(refiRaw.costs),
    fixupPct: Math.min(100, Math.max(0, num(refiRaw.fixupPct))),
  } : { on: false };

  const loan = p.price * (1 - p.downPct / 100);
  const downPayment = p.price - loan;
  const cashInvested = downPayment + p.closingReno;
  const r = p.rate / 100 / 12;
  const n = p.termYears * 12;
  const pi = r === 0 ? loan / n : (loan * r) / (1 - Math.pow(1 + r, -n));

  const years = [];
  let balance = loan;
  let curRate = r;
  let curPI = pi;
  let refiInfo = null;
  const refiInject = {};
  for (let y = 1; y <= p.horizon; y++) {
    if (refi.on && y === refi.year) {
      const valNow = p.price * Math.pow(1 + p.appreciation / 100, y - 1);
      const newLoan = (valNow * refi.ltv) / 100;
      if (newLoan > balance) {
        const netCashOut = newLoan - balance - refi.costs;
        const fixup = Math.max(0, netCashOut) * (refi.fixupPct / 100);
        const invest = Math.max(0, netCashOut) - fixup;
        refiInject[y] = invest;
        curRate = refi.rate / 100 / 12;
        const n2 = refi.termYears * 12;
        curPI = curRate === 0 ? newLoan / n2 : (newLoan * curRate) / (1 - Math.pow(1 + curRate, -n2));
        refiInfo = { year: y, cashOut: Math.max(0, netCashOut), fixup, invest, newPI: curPI, newLoan };
        balance = newLoan;
      }
    }
    let yearPrincipal = 0;
    for (let m = 0; m < 12; m++) {
      const interest = balance * curRate;
      let principal = curPI - interest;
      if (principal > balance) principal = balance;
      balance -= principal;
      yearPrincipal += principal;
    }
    const g = (rate, yr) => Math.pow(1 + rate / 100, yr - 1);
    const propValueStart = p.price * Math.pow(1 + p.appreciation / 100, y - 1);
    const propValueEnd = p.price * Math.pow(1 + p.appreciation / 100, y);
    const annualTax = (propValueStart * p.propTaxRate) / 100;
    const grossRentM = p.rent * g(p.rentIncrease, y);
    const collectedM = grossRentM * (1 - p.vacancy / 100);
    const mgmtM = (collectedM * p.mgmtPct) / 100;
    const opExM =
      annualTax / 12 +
      p.insurance * g(p.expenseGrowth, y) +
      p.hoa * g(p.expenseGrowth, y) +
      p.maintenance * g(p.expenseGrowth, y) +
      mgmtM;
    const cfM = collectedM - curPI - opExM;
    years.push({
      year: y,
      monthlyCF: cfM,
      annualCF: cfM * 12,
      collectedM,
      opExM,
      propValue: propValueEnd,
      balance,
      equity: propValueEnd - balance,
      downPayment,
      paydown: loan - balance,
      appreciation: propValueEnd - p.price,
    });
  }
  const y1 = years[0];
  const noiAnnual = (y1.collectedM - y1.opExM) * 12;
  return {
    pi, loan, downPayment, cashInvested, years, horizon: p.horizon,
    month1CF: y1.monthlyCF,
    capRate: p.price > 0 ? (noiAnnual / p.price) * 100 : 0,
    cocYear1: cashInvested > 0 ? (y1.annualCF / cashInvested) * 100 : 0,
    refiOn: refi.on, refiInfo, refiInject,
  };
}

export function computeMachine(propYears, sRaw, horizonRaw, injections) {
  const num = (v) => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };
  const s = { divYield: num(sRaw.divYield), divGrowth: num(sRaw.divGrowth), callPct: num(sRaw.callPct), stockAppr: num(sRaw.stockAppr) };
  const horizon = Math.min(40, Math.max(1, Math.round(num(horizonRaw))));
  const inj = injections || {};
  const rows = [];
  let balR = 0;    // reinvest account value
  let balI = 0;    // income account: contributions only (position)
  let totalContrib = 0;
  let totalIncomeTaken = 0;
  let lastYield = 0, lastCall = s.callPct / 100;
  for (let y = 1; y <= horizon; y++) {
    const yieldA = (s.divYield * Math.pow(1 + s.divGrowth / 100, y - 1)) / 100;
    const callA = s.callPct / 100;
    lastYield = yieldA; lastCall = callA;
    const contribM = Math.max(0, propYears[y - 1] ? propYears[y - 1].monthlyCF : 0);
    const lump = inj[y] || 0;
    if (lump > 0) { balR += lump; balI += lump; totalContrib += lump; }
    const aM = (s.stockAppr / 100) / 12;
    let incomeTakenYear = 0;
    for (let m = 0; m < 12; m++) {
      // reinvest: price appreciates, income compounds back in
      const incR = balR * (yieldA / 12 + callA / 12);
      balR = balR * (1 + aM) + contribM + incR;
      // take income: price appreciates, contributions add shares, income is pulled out
      const incI = balI * (yieldA / 12 + callA / 12);
      balI = balI * (1 + aM) + contribM;
      incomeTakenYear += incI;
      totalContrib += contribM;
    }
    totalIncomeTaken += incomeTakenYear;
    rows.push({
      year: y,
      reinvest: balR,
      contributions: balI,          // position value if taking income (flat price)
      incomeThisYear: incomeTakenYear,
      contribAnnual: contribM * 12,
    });
  }
  const final = rows[rows.length - 1];
  return {
    rows,
    totalContrib,
    totalIncomeTaken,
    reinvestFinal: final.reinvest,
    incomePosition: final.contributions,
    annualIncomeAtEnd: final.contributions * (lastYield + lastCall),
    reinvestAnnualIncome: final.reinvest * (lastYield + lastCall),
    combinedRate: lastYield + lastCall,
  };
}
