// Local file-backed scenario store — a stand-in for a real DB in production.
// Swap this module out for a real backend (Postgres, DynamoDB, etc.) at deploy time;
// the route handler in app/api/scenarios/route.js is the only caller.
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "scenarios.json");

async function readAll() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(records) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), "utf8");
}

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function listScenarios(email) {
  const all = await readAll();
  return all.filter((r) => r.email.toLowerCase() === email.toLowerCase());
}

export async function saveScenario({ name, email, p, s, refi }) {
  const all = await readAll();
  const key = `${slugify(email)}:${slugify(name || "untitled")}`;
  const record = { key, name: name || "Untitled", email, ts: Date.now(), p, s, refi };
  const next = [record, ...all.filter((r) => r.key !== key)];
  await writeAll(next);
  return record;
}

export async function deleteScenario(key) {
  const all = await readAll();
  await writeAll(all.filter((r) => r.key !== key));
}
