// TODO(beehiiv): wire this up to the real Beehiiv API once credentials exist.
// Needs BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID env vars — see
// https://developers.beehiiv.com/api-reference/subscriptions/create
// Called from app/api/scenarios/route.js on every scenario save (the opt-in moment).
export async function subscribeToBeehiiv(email) {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  if (!apiKey || !publicationId) {
    console.log(`[beehiiv stub] would subscribe ${email} — set BEEHIIV_API_KEY / BEEHIIV_PUBLICATION_ID to go live`);
    return { subscribed: false, reason: "not_configured" };
  }

  const res = await fetch(`https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, reactivate_existing: false, send_welcome_email: true }),
  });

  if (!res.ok) {
    console.error("[beehiiv] subscribe failed", res.status, await res.text());
    return { subscribed: false, reason: "api_error" };
  }
  return { subscribed: true };
}
