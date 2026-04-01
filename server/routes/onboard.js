import { Hono } from "hono";
import { nanoid } from "nanoid";

const onboard = new Hono();

// GET /api/onboard/:code — validate event link
onboard.get("/:code", async (c) => {
  const db = c.get("db");
  const code = c.req.param("code");

  const event = await db
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
  const count = await db
    .prepare("SELECT COUNT(*) as cnt FROM attendees WHERE event_id = ?")
    .get(event.id);

  if (event.max_attendees > 0 && count.cnt >= event.max_attendees) {
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

// POST /api/onboard/:code/claim — create attendee with custodial wallet
onboard.post("/:code/claim", async (c) => {
  const db = c.get("db");
  const code = c.req.param("code");
  const body = await c.req.json();

  const { displayName } = body;

  if (!displayName || !displayName.trim()) {
    return c.json({ error: "Nombre requerido" }, 400);
  }

  const event = await db.prepare("SELECT * FROM events WHERE code = ?").get(code);

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
  const count = await db
    .prepare("SELECT COUNT(*) as cnt FROM attendees WHERE event_id = ?")
    .get(event.id);

  if (event.max_attendees > 0 && count.cnt >= event.max_attendees) {
    return c.json({ error: "Evento lleno." }, 403);
  }

  // Generate unique attendee token
  const token = nanoid(21);

  // Generate lightning address from name
  const host = c.req.header("host") || "localhost";
  const lightningAddress = generateLightningAddress(displayName.trim(), host);

  // Welcome sats (custodial — credited directly to virtual balance)
  const welcomeSats = event.welcome_sats || 100;

  try {
    const result = await db
      .prepare(
        `INSERT INTO attendees (event_id, token, display_name, lightning_address, balance_sats, welcome_funded, onboarding_complete)
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`
      )
      .run(
        event.id,
        token,
        displayName.trim(),
        lightningAddress,
        welcomeSats,
        1,
        0
      );

    // Record welcome transaction
    await db
      .prepare(
        "INSERT INTO transactions (attendee_id, type, amount_sats, fee_sats, description) VALUES (?, ?, ?, ?, ?)"
      )
      .run(result.lastInsertRowid, "welcome", welcomeSats, 0, `Bienvenida ${event.name}`);

    console.log(
      `⚡ Nuevo asistente: ${displayName.trim()} → ${lightningAddress} (custodial, ${welcomeSats} sats)`
    );

    return c.json(
      {
        attendee: {
          id: result.lastInsertRowid,
          token,
          displayName: displayName.trim(),
          lightningAddress,
          balanceSats: welcomeSats,
          welcomeFunded: true,
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
 */
function generateLightningAddress(name, host) {
  const sanitized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);

  const suffix = nanoid(4).toLowerCase();
  return `${sanitized || "user"}${suffix}@${host}`;
}

export default onboard;
