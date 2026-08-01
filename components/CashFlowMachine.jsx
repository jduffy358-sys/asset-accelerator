"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { C } from "@/lib/brand";
import { money, money0, kAxis, pct } from "@/lib/format";
import { computeProperty, computeMachine } from "@/lib/model";
import { defaultProperty, defaultMachine, defaultRefi } from "@/lib/defaults";
import { Field, Stat, ChartCard, SectionTitle, tip } from "@/components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CashFlowMachine() {
  const [tab, setTab] = useState(1);
  const [p, setP] = useState(defaultProperty);
  const [s, setS] = useState(defaultMachine);
  const [refi, setRefi] = useState(defaultRefi);

  const setPf = (k) => (v) => setP((o) => ({ ...o, [k]: v }));
  const setSf = (k) => (v) => setS((o) => ({ ...o, [k]: v }));
  const setRf = (k) => (v) => setRefi((o) => ({ ...o, [k]: v }));

  // ---- saved scenarios (real backend, gated by email — the lead-capture opt-in) ----
  const [email, setEmail] = useState(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("aa-email") || "" : ""
  );
  const [emailError, setEmailError] = useState("");
  const [scenName, setScenName] = useState("");
  const [saved, setSaved] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    async function loadSaved() {
      if (!EMAIL_RE.test(email)) {
        if (alive) setSaved([]);
        return;
      }
      const res = await fetch(`/api/scenarios?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (alive) setSaved(data.scenarios || []);
    }
    loadSaved().catch(() => {});
    return () => { alive = false; };
  }, [email]);

  const saveScenario = async () => {
    if (!EMAIL_RE.test(email)) { setEmailError("Enter a valid email to save your scenario."); return; }
    setEmailError("");
    setSaving(true);
    try {
      window.localStorage.setItem("aa-email", email);
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: scenName || "Untitled", email, p, s, refi }),
      });
      const data = await res.json();
      if (!res.ok) { setEmailError(data.error || "Couldn't save — try again."); return; }
      setSaved((prev) => [data.scenario, ...prev.filter((x) => x.key !== data.scenario.key)]);
      setScenName("");
    } finally {
      setSaving(false);
    }
  };
  const loadScenario = (rec) => { if (rec.p) setP(rec.p); if (rec.s) setS(rec.s); if (rec.refi) setRefi(rec.refi); };
  const removeScenario = async (rec) => {
    await fetch(`/api/scenarios?key=${encodeURIComponent(rec.key)}`, { method: "DELETE" }).catch(() => {});
    setSaved((prev) => prev.filter((x) => x.key !== rec.key));
  };

  const prop = useMemo(() => computeProperty(p, refi), [p, refi]);
  const machine = useMemo(() => computeMachine(prop.years, s, p.horizon, prop.refiInject), [prop, s, p.horizon]);

  const cfData = prop.years.map((y) => ({ year: "Yr " + y.year, cash: Math.round(y.monthlyCF) }));
  const equityData = prop.years.map((y) => ({
    year: "Yr " + y.year,
    Down: Math.round(y.downPayment),
    Paydown: Math.round(y.paydown),
    Appreciation: Math.round(Math.max(0, y.appreciation)),
  }));
  const valueDebtData = prop.years.map((y) => ({
    year: "Yr " + y.year,
    Value: Math.round(y.propValue),
    Debt: Math.round(y.balance),
  }));
  const machineData = machine.rows.map((r) => ({
    year: "Yr " + r.year,
    Reinvested: Math.round(r.reinvest),
    "Take the income": Math.round(r.contributions),
  }));
  const incomeData = machine.rows.map((r) => ({ year: "Yr " + r.year, income: Math.round(r.incomeThisYear) }));

  const negCF = prop.month1CF < 0;
  const noFuel = machine.totalContrib <= 0;
  const firstPositive = prop.years.find((y) => y.monthlyCF > 0);
  const firstPositiveYear = firstPositive ? firstPositive.year : null;

  const lastYear = prop.years[prop.years.length - 1];
  const propEquityFinal = lastYear.equity;
  const machineFinal = machine.reinvestFinal;
  const totalNetWorth = propEquityFinal + machineFinal;
  const combinedData = prop.years.map((y, i) => ({
    year: "Yr " + y.year,
    "Property equity": Math.round(y.equity),
    "Machine account": Math.round(machine.rows[i] ? machine.rows[i].reinvest : 0),
  }));

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: C.offwhite, color: C.ink, minHeight: "100%", padding: "0 0 40px" }}>
      <style>{`
        .aa-input::-webkit-outer-spin-button,.aa-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
        .aa-input{ -moz-appearance:textfield; }
        .aa-input:focus{ outline:none; }
        .aa-fieldwrap:focus-within{ border-color:${C.green}; }
        .aa-grid{ display:grid; grid-template-columns: 360px 1fr; gap:28px; }
        @media (max-width: 860px){ .aa-grid{ grid-template-columns:1fr; } }
        .aa-tab{ cursor:pointer; }
      `}</style>

      {/* header */}
      <div style={{ background: C.navy, color: C.offwhite, padding: "22px 32px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontSize: 12, letterSpacing: 3, color: C.cream, fontWeight: 700 }}>ASSET ACCELERATOR</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 30, fontWeight: 700, margin: "4px 0 2px" }}>
            The Cash-Flow Machine
          </div>
          <div style={{ color: "#B9C2D4", fontSize: 14, maxWidth: 620, marginBottom: 18 }}>
            One property. Two engines. See what the rental pays you — then watch that cash flow build a second income stream.
          </div>
          {/* tabs */}
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { id: 1, n: "1", t: "The Property" },
              { id: 2, n: "2", t: "The Machine" },
              { id: 3, n: "3", t: "The Payoff" },
            ].map((x) => {
              const on = tab === x.id;
              const badge = x.id === 1 ? C.rust : x.id === 2 ? C.green : `linear-gradient(135deg, ${C.rust}, ${C.green})`;
              return (
                <div key={x.id} className="aa-tab" onClick={() => setTab(x.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "11px 18px",
                    background: on ? C.offwhite : "transparent",
                    color: on ? C.navy : "#B9C2D4",
                    borderRadius: "10px 10px 0 0", fontWeight: 700, fontSize: 15,
                    border: on ? "none" : "1px solid rgba(255,255,255,0.15)", borderBottom: "none",
                  }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 5, display: "grid", placeItems: "center",
                    background: on ? badge : "rgba(255,255,255,0.12)",
                    color: "#fff", fontSize: 13,
                  }}>{x.n}</span>
                  {x.t}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px 0" }}>
        {/* scenarios */}
        <div style={{ background: "#fff", border: "1px solid #E4DDCE", borderRadius: 10, padding: "10px 14px", marginBottom: 22 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.navy, textTransform: "uppercase", letterSpacing: 0.6 }}>Save my scenario</span>
            <input
              className="aa-input"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
              placeholder="you@email.com"
              style={{ border: "1px solid #D9D2C4", borderRadius: 7, padding: "6px 10px", fontSize: 13, color: C.ink, outline: "none", width: 180 }}
            />
            <input
              className="aa-input"
              value={scenName}
              onChange={(e) => setScenName(e.target.value)}
              placeholder="Name this scenario"
              style={{ border: "1px solid #D9D2C4", borderRadius: 7, padding: "6px 10px", fontSize: 13, color: C.ink, outline: "none", width: 170 }}
            />
            <button onClick={saveScenario} disabled={saving} style={{ background: C.navy, color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Email me my numbers"}
            </button>
            <span style={{ width: 1, height: 22, background: "#E4DDCE" }} />
            {saved.length === 0 && !emailError && (
              <span style={{ fontSize: 12, color: C.muted }}>
                Enter your email to save this scenario and pull it up again later.
              </span>
            )}
            {saved.map((rec) => (
              <span key={rec.key} style={{ display: "inline-flex", alignItems: "center", background: C.offwhite, border: "1px solid #E4DDCE", borderRadius: 20, overflow: "hidden" }}>
                <button onClick={() => loadScenario(rec)} title="Load" style={{ background: "transparent", border: "none", padding: "5px 4px 5px 12px", fontSize: 13, fontWeight: 600, color: C.navy, cursor: "pointer" }}>
                  {rec.name}
                </button>
                <button onClick={() => removeScenario(rec)} title="Remove" style={{ background: "transparent", border: "none", padding: "5px 10px 5px 6px", fontSize: 14, color: C.muted, cursor: "pointer", lineHeight: 1 }}>
                  ×
                </button>
              </span>
            ))}
          </div>
          {emailError && <div style={{ fontSize: 12, color: C.rust, marginTop: 6 }}>{emailError}</div>}
        </div>

        {/* ---------------- PAGE 1 ---------------- */}
        {tab === 1 && (
          <div className="aa-grid">
            {/* inputs */}
            <div>
              <SectionTitle color={C.rust}>The Property</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
                <Field label="Purchase price" prefix="$" value={p.price} onChange={setPf("price")} />
                <Field label="Down payment" suffix="%" value={p.downPct} onChange={setPf("downPct")} />
                <Field label="Interest rate" suffix="%" value={p.rate} onChange={setPf("rate")} />
                <Field label="Loan term" suffix="yrs" value={p.termYears} onChange={setPf("termYears")} />
                <Field label="Monthly rent" prefix="$" value={p.rent} onChange={setPf("rent")} />
                <Field label="Rent increase / yr" suffix="%" value={p.rentIncrease} onChange={setPf("rentIncrease")} />
                <Field label="Vacancy" suffix="%" value={p.vacancy} onChange={setPf("vacancy")} />
                <Field label="Appreciation / yr" suffix="%" value={p.appreciation} onChange={setPf("appreciation")} />
              </div>
              <SectionTitle color={C.rust} small>Operating costs</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
                <Field label="Property tax / yr" suffix="%" value={p.propTaxRate} onChange={setPf("propTaxRate")} hint="of property value" />
                <Field label="Insurance / mo" prefix="$" value={p.insurance} onChange={setPf("insurance")} />
                <Field label="HOA / mo" prefix="$" value={p.hoa} onChange={setPf("hoa")} />
                <Field label="Maintenance / mo" prefix="$" value={p.maintenance} onChange={setPf("maintenance")} />
                <Field label="Management" suffix="%" value={p.mgmtPct} onChange={setPf("mgmtPct")} hint="of rent" />
                <Field label="Expense growth / yr" suffix="%" value={p.expenseGrowth} onChange={setPf("expenseGrowth")} />
                <Field label="Closing + reno" prefix="$" value={p.closingReno} onChange={setPf("closingReno")} />
                <Field label="Hold horizon" suffix="yrs" value={p.horizon} onChange={setPf("horizon")} />
              </div>

              <div style={{ marginTop: 18, borderTop: "1px solid #E4DDCE", paddingTop: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <span onClick={() => setRf("on")(!refi.on)} style={{ width: 40, height: 22, borderRadius: 22, background: refi.on ? C.green : "#CFC7B6", position: "relative", flexShrink: 0 }}>
                    <span style={{ position: "absolute", top: 2, left: refi.on ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff" }} />
                  </span>
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: C.navy }}>Add a cash-out refinance</span>
                </label>
                {refi.on && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
                      Pull tax-free equity out with a new loan. Part covers big-ticket upkeep (roof, HVAC); the rest is fed into the machine.
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
                      <Field label="Refi in year" suffix="yr" value={refi.year} onChange={setRf("year")} />
                      <Field label="Max LTV" suffix="%" value={refi.ltv} onChange={setRf("ltv")} hint="65–75 typical" />
                      <Field label="New rate" suffix="%" value={refi.rate} onChange={setRf("rate")} />
                      <Field label="New term" suffix="yrs" value={refi.termYears} onChange={setRf("termYears")} />
                      <Field label="Refi costs" prefix="$" value={refi.costs} onChange={setRf("costs")} hint="rolled in" />
                      <Field label="To fix-up" suffix="%" value={refi.fixupPct} onChange={setRf("fixupPct")} hint="rest invested" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* results */}
            <div>
              <div style={{
                background: negCF ? "#7a2f2f" : C.rust, color: "#fff", borderRadius: 12, padding: "18px 22px", marginBottom: 20,
              }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: C.cream, fontWeight: 700 }}>
                  Monthly cash flow · month 1
                </div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 42, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
                  {money(prop.month1CF)}<span style={{ fontSize: 18, opacity: 0.8 }}> /mo</span>
                </div>
                <div style={{ fontSize: 13, color: C.cream, marginTop: 2 }}>
                  {negCF ? "Negative — the property costs you money to hold at these inputs." :
                    `Grows to ${money(prop.years[prop.years.length - 1].monthlyCF)}/mo by year ${p.horizon} as rents rise.`}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 22 }}>
                <Stat label="Cap rate" value={pct(prop.capRate)} accent={C.rust} />
                <Stat label="Cash-on-cash yr 1" value={pct(prop.cocYear1)} accent={C.rust} sub={`on ${money0(prop.cashInvested)} in`} />
                <Stat label="Equity built" value={money0(prop.years[prop.years.length - 1].equity)} accent={C.navy} sub={`by year ${p.horizon}`} />
              </div>

              {prop.refiInfo && (
                <div style={{ background: "#EEF3EE", border: `1px solid ${C.green}`, borderRadius: 10, padding: "12px 16px", marginBottom: 18, fontSize: 13, color: C.navy, lineHeight: 1.5 }}>
                  <b>Year {prop.refiInfo.year} cash-out refi:</b> pull {money0(prop.refiInfo.cashOut)} tax-free — {money0(prop.refiInfo.fixup)} to upkeep, {money0(prop.refiInfo.invest)} into the machine. Payment resets to {money0(prop.refiInfo.newPI)}/mo.
                </div>
              )}

              <ChartCard title="Monthly cash flow, year by year">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={cfData} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4DDCE" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={kAxis} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={44} />
                    <Tooltip {...tip} formatter={(v) => money(v)} />
                    <Bar dataKey="cash" name="Cash flow / mo" fill={C.rust} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {prop.refiOn ? (
                <ChartCard title="Property value vs. loan balance">
                  <ResponsiveContainer width="100%" height={210}>
                    <LineChart data={valueDebtData} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E4DDCE" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={kAxis} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={44} />
                      <Tooltip {...tip} formatter={(v) => money(v)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="Value" stroke={C.green} strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="Debt" stroke={C.rust} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
                    The gap between the lines is your equity — it dips when you pull cash out at the refi, then rebuilds.
                  </div>
                </ChartCard>
              ) : (
                <ChartCard title="How your equity builds">
                  <ResponsiveContainer width="100%" height={210}>
                    <AreaChart data={equityData} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E4DDCE" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={kAxis} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={44} />
                      <Tooltip {...tip} formatter={(v) => money(v)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="Down" stackId="1" stroke={C.navy} fill={C.navy} />
                      <Area type="monotone" dataKey="Paydown" stackId="1" stroke={C.rust} fill={C.rust} />
                      <Area type="monotone" dataKey="Appreciation" stackId="1" stroke={C.green} fill={C.greenLt} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              <div style={{ textAlign: "right", marginTop: 14 }}>
                <button onClick={() => setTab(2)} style={{
                  background: C.green, color: "#fff", border: "none", borderRadius: 9,
                  padding: "12px 20px", fontSize: 15, fontWeight: 700, cursor: "pointer",
                }}>
                  Now redeploy this cash flow →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- PAGE 2 ---------------- */}
        {tab === 2 && (
          <div className="aa-grid">
            {/* inputs + fuel */}
            <div>
              <div style={{ background: "#fff", border: `1px solid #E4DDCE`, borderLeft: `4px solid ${C.rust}`, borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: C.rust, fontWeight: 700 }}>Fuel from the property</div>
                <div style={{ fontSize: 14, color: C.ink, marginTop: 4, lineHeight: 1.5 }}>
                  Starts at <b>{money(prop.month1CF)}/mo</b>, rising to <b>{money(prop.years[prop.years.length - 1].monthlyCF)}/mo</b> by year {p.horizon}.
                  You feed <b>{money0(machine.totalContrib)}</b> in over {p.horizon} years.
                  {prop.refiInfo && prop.refiInfo.invest > 0 && (
                    <> That includes a <b>{money0(prop.refiInfo.invest)}</b> lump sum from your year-{prop.refiInfo.year} refi.</>
                  )}
                </div>
              </div>

              <SectionTitle color={C.green}>The Machine</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
                <Field label="Dividend yield" suffix="%" value={s.divYield} onChange={setSf("divYield")} />
                <Field label="Dividend growth / yr" suffix="%" value={s.divGrowth} onChange={setSf("divGrowth")} hint="0 = flat" />
                <Field label="Covered-call premium / yr" suffix="%" value={s.callPct} onChange={setSf("callPct")} hint="annualized; varies" />
                <Field label="Stock appreciation / yr" suffix="%" value={s.stockAppr} onChange={setSf("stockAppr")} hint="price only" />
                <Field label="Horizon" suffix="yrs" value={p.horizon} onChange={setPf("horizon")} hint="shared with property" />
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                Appreciation here is <b>price only</b> — the dividend and premium are counted separately, so total return is roughly the three added together.
                For non-growth dividend stocks, 4–6% price growth is a defensible range; at 8% on top of a 4% dividend you&apos;re assuming a 12%+ total return, which is aggressive.
                And because you&apos;re writing covered calls, real gains get capped near the strike — one more reason to keep this conservative.
              </div>
            </div>

            {/* results */}
            <div>
              {negCF && !noFuel && (
                <div style={{ background: "#F6E9DF", border: `1px solid ${C.rust}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.rust }}>
                  Heads up: cash flow starts negative, so the machine gets no fuel until it turns positive{firstPositiveYear ? ` in year ${firstPositiveYear}` : ""}.
                </div>
              )}
              {noFuel ? (
                <div style={{ background: "#fff", border: "1px solid #E4DDCE", borderRadius: 12, padding: "28px 24px", textAlign: "center" }}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: C.navy, fontWeight: 700, marginBottom: 6 }}>No cash flow to redeploy yet</div>
                  <div style={{ fontSize: 14, color: C.muted, maxWidth: 440, margin: "0 auto", lineHeight: 1.5 }}>
                    This property doesn&apos;t throw off positive cash flow over your {prop.horizon}-year window, so there&apos;s nothing to feed the machine. On the Property page, try a lower price, a higher rent, or a larger down payment until the monthly number turns green.
                  </div>
                  <button onClick={() => setTab(1)} style={{ marginTop: 16, background: C.rust, color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}>← Back to the property</button>
                </div>
              ) : (
              <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                <div style={{ background: C.green, color: "#fff", borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#DCEAE0", fontWeight: 700 }}>If you reinvest · snowball</div>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1.1, marginTop: 3 }}>
                    {money0(machine.reinvestFinal)}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#DCEAE0", marginTop: 2 }}>
                    account by year {p.horizon} — throwing off {money0(machine.reinvestAnnualIncome)}/yr ({pct(machine.combinedRate * 100)})
                  </div>
                </div>
                <div style={{ background: C.navy, color: "#fff", borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: C.cream, fontWeight: 700 }}>If you take it · paycheck</div>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1.1, marginTop: 3 }}>
                    {money0(machine.annualIncomeAtEnd)}<span style={{ fontSize: 15, opacity: 0.75 }}>/yr</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: C.cream, marginTop: 2 }}>
                    by year {p.horizon}, on a {money0(machine.incomePosition)} position. {money0(machine.totalIncomeTaken)} pulled out along the way.
                  </div>
                </div>
              </div>

              <ChartCard title="Account value: reinvesting vs. taking the income">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={machineData} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4DDCE" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={kAxis} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={44} />
                    <Tooltip {...tip} formatter={(v) => money(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Reinvested" stroke={C.green} strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="Take the income" stroke={C.rust} strokeWidth={2} strokeDasharray="5 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
                  The gap between the lines is the compounding you capture by reinvesting instead of spending the income.
                </div>
              </ChartCard>

              <ChartCard title="Yearly income the machine pays out (if you take it)">
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={incomeData} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4DDCE" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={kAxis} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={44} />
                    <Tooltip {...tip} formatter={(v) => money(v)} />
                    <Bar dataKey="income" name="Income / yr" fill={C.green} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              </>
              )}
            </div>
          </div>
        )}

        {/* ---------------- PAGE 3 ---------------- */}
        {tab === 3 && (
          <div>
            <div style={{ background: C.navy, color: "#fff", borderRadius: 14, padding: "26px 28px", marginBottom: 22 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2, color: C.cream, fontWeight: 700 }}>
                Total net worth · year {prop.horizon}
              </div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 52, fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1.05, margin: "2px 0 6px" }}>
                {money0(totalNetWorth)}
              </div>
              <div style={{ fontSize: 14, color: "#B9C2D4", maxWidth: 580 }}>
                Built from {money0(prop.cashInvested)} down and one property&apos;s cash flow — no new money out of pocket after the purchase.
              </div>
              <div style={{ display: "flex", gap: 20, marginTop: 18, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: C.cream, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>Property equity</div>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 700 }}>{money0(propEquityFinal)}</div>
                </div>
                <div style={{ color: "#7f8aa3", fontSize: 24, fontWeight: 700 }}>+</div>
                <div>
                  <div style={{ fontSize: 11, color: "#DCEAE0", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 700 }}>Machine account</div>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 700 }}>{money0(machineFinal)}</div>
                </div>
              </div>
            </div>

            <ChartCard title="Your net worth, both engines stacked">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={combinedData} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4DDCE" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={kAxis} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip {...tip} formatter={(v) => money(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="Property equity" stackId="1" stroke={C.rust} fill={C.rust} />
                  <Area type="monotone" dataKey="Machine account" stackId="1" stroke={C.green} fill={C.greenLt} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
                The rust band is what the property builds on its own. The green band on top is what its cash flow builds in the market — the part most people leave on the table.
              </div>
            </ChartCard>
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 30, lineHeight: 1.6 }}>
          Figures are pre-tax and for illustration only — not investment, tax, or lending advice. Assumes property depreciation largely
          shelters the rental income, and the stock account is held in a tax-deferred account (like an IRA), so it&apos;s taxed on withdrawal.
          Covered-call and dividend income are not guaranteed.
        </div>
      </div>
    </div>
  );
}
