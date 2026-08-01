import { listScenarios, saveScenario, deleteScenario } from "@/lib/store";
import { subscribeToBeehiiv } from "@/lib/beehiiv";

const isEmail = (v) => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function GET(request) {
  const email = new URL(request.url).searchParams.get("email") || "";
  if (!isEmail(email)) return Response.json({ scenarios: [] });
  const scenarios = await listScenarios(email);
  return Response.json({ scenarios });
}

export async function POST(request) {
  const body = await request.json();
  const { name, email, p, s, refi } = body || {};
  if (!isEmail(email)) {
    return Response.json({ error: "A valid email is required to save a scenario." }, { status: 400 });
  }
  const record = await saveScenario({ name, email, p, s, refi });
  const beehiiv = await subscribeToBeehiiv(email);
  return Response.json({ scenario: record, beehiiv });
}

export async function DELETE(request) {
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!key) return Response.json({ error: "key is required" }, { status: 400 });
  await deleteScenario(key);
  return Response.json({ ok: true });
}
