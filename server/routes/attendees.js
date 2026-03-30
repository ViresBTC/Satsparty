import { Hono } from "hono";
import { nanoid } from "nanoid";

const attendees = new Hono();

/**
 * POST /api/attendees/register — register a user who connects their own wallet
 * No event required. Creates a record so the Lightning Address works via LNURL.
 *
 * Body: { displayName, nwcUrl, lightningAddress }
 */
attendees.post("/register", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const { displayName, nwcUrl, lightningAddress } = body;

  if (!displayName || !displayName.trim()) {
    return c.json({ error: "Nombre requerido" }, 400);
  }

  if (!nwcUrl) {
    return c.json({ error: "NWC URL requerida" }, 400);
  }

  if (!lightningAddress) {
    return c.json({ error: "Lightning Address requerida" }, 400);
  }

  // Check if this lightning address is already taken
  const username = lightningAddress.split("@")[0];
  const existing = await db
    .prepare("SELECT id FROM attendees WHERE lightning_address LIKE ? || '@%'")
    .get(username);

  if (existing) {
    return c.json({ error: "Ese nombre ya está en uso. Elegí otro." }, 409);
  }

  const token = nanoid(21);

  try {
    const result = await db
      .prepare(
        `INSERT INTO attendees (event_id, token, display_name, lightning_address, nwc_url, balance_sats, welcome_funded, onboarding_complete)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
      )
      .run(
        null, // event_id = null means "no event" (self-registered)
        token,
        displayName.trim(),
        lightningAddress,
        nwcUrl,
        0,
        0,
        1
      );

    console.log(
      `⚡ Usuario registrado: ${displayName.trim()} → ${lightningAddress}`
    );

    return c.json({
      attendee: {
        id: result.lastInsertRowid,
        token,
        displayName: displayName.trim(),
        lightningAddress,
      },
    });
  } catch (err) {
    console.error("[Attendees] Register error:", err.message);
    return c.json({ error: "Error al registrar usuario" }, 500);
  }
});

// GET /api/attendees/:id — get attendee data
attendees.get("/:id", async (c) => {
  return c.json({ message: "TODO: get attendee" }, 501);
});

// PATCH /api/attendees/:id — update attendee
attendees.patch("/:id", async (c) => {
  return c.json({ message: "TODO: update attendee" }, 501);
});

export default attendees;
