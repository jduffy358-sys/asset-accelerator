import { describe, it, expect } from "vitest";
import { computeProperty, computeMachine } from "./model.js";
import { defaultProperty, defaultMachine, defaultRefi } from "./defaults.js";

describe("computeProperty — default scenario", () => {
  const result = computeProperty(defaultProperty, defaultRefi);

  it("has no NaNs anywhere in the year rows", () => {
    for (const y of result.years) {
      for (const k in y) expect(Number.isNaN(y[k]), `${k} is NaN`).toBe(false);
    }
  });

  it("lands ~$553/mo month-1 cash flow, per the handoff brief", () => {
    expect(result.month1CF).toBeGreaterThan(540);
    expect(result.month1CF).toBeLessThan(566);
  });

  it("produces the expected horizon length", () => {
    expect(result.years).toHaveLength(10);
    expect(result.years[9].year).toBe(10);
  });

  it("loan balance decreases monotonically without a refi", () => {
    for (let i = 1; i < result.years.length; i++) {
      expect(result.years[i].balance).toBeLessThanOrEqual(result.years[i - 1].balance);
    }
  });

  it("property value increases monotonically with positive appreciation", () => {
    for (let i = 1; i < result.years.length; i++) {
      expect(result.years[i].propValue).toBeGreaterThan(result.years[i - 1].propValue);
    }
  });

  it("cash flow rises year over year as rent grows faster than expenses", () => {
    const first = result.years[0].monthlyCF;
    const last = result.years[result.years.length - 1].monthlyCF;
    expect(last).toBeGreaterThan(first);
  });
});

describe("computeProperty — cash-out refinance", () => {
  const refi = { ...defaultRefi, on: true, year: 5 };
  const result = computeProperty(defaultProperty, refi);

  it("injects a lump sum in the refi year and resets the loan", () => {
    expect(result.refiOn).toBe(true);
    expect(result.refiInfo).not.toBeNull();
    expect(result.refiInfo.year).toBe(5);
    expect(result.refiInfo.invest).toBeGreaterThan(0);
    expect(result.refiInject[5]).toBeCloseTo(result.refiInfo.invest, 5);
  });

  it("resets the balance up toward the new LTV cap at the refi year", () => {
    const preRefiBalance = result.years[3].balance;
    const postRefiBalance = result.years[4].balance;
    expect(postRefiBalance).toBeGreaterThan(preRefiBalance);
  });

  it("still has no NaNs with refi active", () => {
    for (const y of result.years) {
      for (const k in y) expect(Number.isNaN(y[k])).toBe(false);
    }
  });
});

describe("computeProperty — negative cash flow", () => {
  it("reports negative month1CF for an over-leveraged, under-rented property", () => {
    const bad = { ...defaultProperty, price: 500000, rent: 1500, downPct: 5 };
    const result = computeProperty(bad, defaultRefi);
    expect(result.month1CF).toBeLessThan(0);
  });
});

describe("computeMachine", () => {
  it("stays at zero when there's no property cash flow to redeploy", () => {
    const flatYears = Array.from({ length: 10 }, (_, i) => ({ year: i + 1, monthlyCF: 0 }));
    const result = computeMachine(flatYears, defaultMachine, 10, {});
    expect(result.totalContrib).toBe(0);
    expect(result.reinvestFinal).toBe(0);
  });

  it("grows the reinvest balance faster than the take-income position", () => {
    const prop = computeProperty(defaultProperty, defaultRefi);
    const result = computeMachine(prop.years, defaultMachine, defaultProperty.horizon, prop.refiInject);
    expect(result.reinvestFinal).toBeGreaterThan(result.incomePosition);
  });

  it("has no NaNs across rows", () => {
    const prop = computeProperty(defaultProperty, defaultRefi);
    const result = computeMachine(prop.years, defaultMachine, defaultProperty.horizon, prop.refiInject);
    for (const row of result.rows) {
      for (const k in row) expect(Number.isNaN(row[k])).toBe(false);
    }
  });

  it("applies a lump-sum injection in the correct year", () => {
    const flatYears = Array.from({ length: 5 }, (_, i) => ({ year: i + 1, monthlyCF: 0 }));
    const result = computeMachine(flatYears, defaultMachine, 5, { 2: 10000 });
    expect(result.rows[0].reinvest).toBe(0);
    expect(result.rows[1].reinvest).toBeGreaterThan(10000);
  });
});
