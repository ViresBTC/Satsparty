import { Hono } from "hono";

const attendees = new Hono();

/**
 * POST /api/attendees/recover — recover account using token
 * Body: { token }
 */
attendees.post("/recover", async (c) => {
  const db = c.get("db");
  const { token } = await c.req.json();

  if (!token || !token.trim()) {
    return c.json({ error: "Token requerido" }, 400);
  }

  const attendee = await db
    .prepare(
      "SELECT id, token, display_name, lightning_address, balance_sats, event_id, onboarding_complete FROM attendees WHERE token = ?"
    )
    .get(token.trim());

  if (!attendee) {
    return c.json({ error: "Token inválido. Verificá que esté bien escrito." }, 404);
  }

  // Update last_seen
  await db.prepare("UPDATE attendees SET last_seen_at = NOW() WHERE id = ?").run(attendee.id);

  // Determine if custodial (has event_id) or self-registered
  const isCustodial = !!attendee.event_id;

  return c.json({
    attendee: {
      id: attendee.id,
      token: attendee.token,
      displayName: attendee.display_name,
      lightningAddress: attendee.lightning_address,
      balanceSats: attendee.balance_sats,
      isCustodial,
      onboardingComplete: !!attendee.onboarding_complete,
    },
  });
});

export default attendees;
