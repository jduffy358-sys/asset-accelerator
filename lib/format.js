export const money = (n) => {
  const r = Math.round(n);
  return (r < 0 ? "-$" : "$") + Math.abs(r).toLocaleString();
};
export const money0 = (n) => "$" + Math.round(n).toLocaleString();
export const kAxis = (n) => (Math.abs(n) >= 1000 ? "$" + Math.round(n / 1000) + "k" : "$" + Math.round(n));
export const pct = (n) => (Math.round(n * 10) / 10).toFixed(1) + "%";
