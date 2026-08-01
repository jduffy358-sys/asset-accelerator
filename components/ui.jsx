"use client";

import { C } from "@/lib/brand";

export function Field({ label, value, onChange, prefix, suffix, hint }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 12, letterSpacing: 0.2, color: C.muted, marginBottom: 5, fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #D9D2C4", borderRadius: 8, overflow: "hidden" }}>
        {prefix && <span style={{ padding: "0 0 0 11px", color: C.muted, fontSize: 14 }}>{prefix}</span>}
        <input
          className="aa-input"
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%", border: "none", outline: "none", padding: "9px 11px",
            fontSize: 15, color: C.ink, background: "transparent",
            fontVariantNumeric: "tabular-nums",
          }}
        />
        {suffix && <span style={{ padding: "0 11px 0 0", color: C.muted, fontSize: 14 }}>{suffix}</span>}
      </span>
      {hint && <span style={{ fontSize: 11, color: C.muted, marginTop: 3, display: "block" }}>{hint}</span>}
    </label>
  );
}

export function Stat({ label, value, accent, sub }) {
  return (
    <div style={{ padding: "14px 16px", background: "#fff", border: "1px solid #E4DDCE", borderRadius: 10, borderLeft: `4px solid ${accent}` }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: C.muted, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: C.navy, fontFamily: "Georgia, serif", fontVariantNumeric: "tabular-nums", lineHeight: 1.15, marginTop: 3 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export const tip = {
  contentStyle: { background: C.navy, border: "none", borderRadius: 8, color: "#fff", fontSize: 12 },
  labelStyle: { color: C.cream, fontWeight: 700 },
  itemStyle: { color: "#fff" },
};

export function SectionTitle({ children, color, small }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: small ? "18px 0 12px" : "0 0 14px" }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
      <span style={{ fontFamily: "Georgia, serif", fontSize: small ? 16 : 19, fontWeight: 700, color: C.navy }}>{children}</span>
    </div>
  );
}

export function ChartCard({ title, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E4DDCE", borderRadius: 12, padding: "14px 16px 12px", marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}
