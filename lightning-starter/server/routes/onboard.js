import { Hono } from "hono";
import { nanoid } from "nanoid";

const onboard = new Hono();

// GET /api/onboard/:code — validate event link
onboard.get("/:code", async (c) => {
  const db = c.get("db");
  const code = c.req.param("code");

  const event = db
    .prepare(
      "SELECT id, name, date, code, welcome_sats, max_attendees, status FROM events WHERE code = ?"
    )
    .get(code);

  if (!event) {
    return c.json({ error: "Evento no encontrado" }, 404);
  }

  if (event.status === "closed") {
    return c.json(
      {
        error: "Este evento ya finalizó. Ya no se pueden reclamar sats.",
        eventName: event.name,
        closed: true,
      },
      403
    );
  }

  // Check capacity
  const count = db
    .prepare("SELECT COUNT(*) as cnt FROM attendees WHERE event_id = ?")
    .get(event.id);

  if (count.cnt >= event.max_attendees) {
    return c.json(
      {
        error: "Evento lleno. Se alcanzó el máximo de asistentes.",
        eventName: event.name,
        full: true,
      },
      403
    );
  }

  return c.json({
    event: {
      name: event.name,
      date: event.date,
      code: event.code,
      welcomeSats: event.welcome_sats,
      spotsLeft: event.max_attendees - count.cnt,
    },
  });
});

// POST /api/onboard/:code/claim — create attendee + wallet
onboard.post("/:code/claim", async (c) => {
  const db = c.get("db");
  const code = c.req.param("code");
  const body = await c.req.json();

  const { displayName } = body;

  if (!displayName || !displayName.trim()) {
    return c.json({ error: "Nombre requerido" }, 400);
  }

  const event = db.prepare("SELECT * FROM events WHERE code = ?").get(code);

  if (!event) {
    return c.json({ error: "Evento no encontrado" }, 404);
  }

  if (event.status === "closed") {
    return c.json(
      { error: "Este evento ya finalizó. Ya no se pueden reclamar sats." },
      403
    );
  }

  // Check capacity
  const count = db
    .prepare("SELECT COUNT(*) as cnt FROM attendees WHERE event_id = ?")
    .get(event.id);

  if (count.cnt >= event.max_attendees) {
    return c.json({ error: "Evento lleno." }, 403);
  }

  // Generate unique attendee token
  const token = nanoid(21);

  // Generate lightning address from name
  const lightningAddress = generateLightningAddress(displayName.trim());

  // Welcome sats
  const welcomeSats = event.welcome_sats || 100;

  // TODO Phase 3: Create real Alby sub-wallet via API
  // For now, create attendee record with demo data
  const nwcUrl = null; // Will be set when Alby integration is done

  try {
    const result = db
      .prepare(
        `INSERT INTO attendees (event_id, token, display_name, lightning_address, nwc_url, balance_sats, welcome_funded)
         VALUES (?, ?, ?, ?, ?, ?, 1)`
      )
      .run(
        event.id,
        token,
        displayName.trim(),
        lightningAddress,
        nwcUrl,
        welcomeSats
      );

    const attendee = db
      .prepare("SELECT * FROM attendees WHERE id = ?")
      .get(result.lastInsertRowid);

    console.log(
      `⚡ Nuevo asistente: ${displayName.trim()} → ${lightningAddress} (${welcomeSats} sats)`
    );

    return c.json(
      {
        attendee: {
          id: attendee.id,
          token: attendee.token,
          displayName: attendee.display_name,
          lightningAddress: attendee.lightning_address,
          balanceSats: attendee.balance_sats,
          welcomeFunded: true,
          nwcUrl: attendee.nwc_url,
        },
        event: {
          name: event.name,
          welcomeSats,
        },
      },
      201
    );
  } catch (err) {
    console.error("Error creating attendee:", err);
    return c.json({ error: "Error creando asistente" }, 500);
  }
});

/**
 * Generate a lightning address from a display name
 * "Juan Pérez" → "juanperez@satsparty.app"
 * "María José" → "mariajose@satsparty.app"
 */
function generateLightningAddress(name) {
  const sanitized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]/g, "") // only alphanumeric
    .slice(0, 20); // max 20 chars

  // Add random suffix to avoid collisions
  const suffix = nanoid(4).toLowerCase();
  return `${sanitized || "user"}${suffix}@satsparty.app`;
}

export default onboard;
