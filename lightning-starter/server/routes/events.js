import { Hono } from "hono";
import { nanoid } from "nanoid";
import { requireAdmin } from "../middleware/auth.js";

const events = new Hono();

// All event routes require admin auth
events.use("*", requireAdmin());

// ── POST /api/events — create event ──
events.post("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();

  const { name, date, welcomeSats, maxAttendees, albyHubUrl, albyAuthToken } =
    body;

  // Validate required fields
  if (!name || !date || !albyHubUrl || !albyAuthToken) {
    return c.json(
      {
        error: "Campos requeridos: name, date, albyHubUrl, albyAuthToken",
      },
      400
    );
  }

  // Generate unique 8-char event code for QR links
  const code = nanoid(8);

  try {
    const result = db
      .prepare(
        `INSERT INTO events (name, date, code, welcome_sats, max_attendees, alby_hub_url, alby_auth_token)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name,
        date,
        code,
        welcomeSats || 100,
        maxAttendees || 100,
        albyHubUrl,
        albyAuthToken
      );

    const event = db
      .prepare("SELECT * FROM events WHERE id = ?")
      .get(result.lastInsertRowid);

    return c.json(
      {
        event: sanitizeEvent(event),
      },
      201
    );
  } catch (err) {
    console.error("Error creating event:", err);
    return c.json({ error: "Error creando evento" }, 500);
  }
});

// ── GET /api/events — list all events ──
events.get("/", async (c) => {
  const db = c.get("db");

  const rows = db
    .prepare(
      `SELECT e.*,
        (SELECT COUNT(*) FROM attendees WHERE event_id = e.id) as attendee_count,
        (SELECT COUNT(*) FROM attendees WHERE event_id = e.id AND onboarding_complete = 1) as onboarded_count
       FROM events e ORDER BY e.created_at DESC`
    )
    .all();

  return c.json({
    events: rows.map((row) => ({
      ...sanitizeEvent(row),
      attendeeCount: row.attendee_count,
      onboardedCount: row.onboarded_count,
    })),
  });
});

// ── GET /api/events/:id — event detail + stats ──
events.get("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(id);
  if (!event) {
    return c.json({ error: "Evento no encontrado" }, 404);
  }

  // Get stats
  const stats = db
    .prepare(
      `SELECT
        COUNT(*) as total_attendees,
        SUM(CASE WHEN onboarding_complete = 1 THEN 1 ELSE 0 END) as onboarded,
        SUM(CASE WHEN welcome_funded = 1 THEN 1 ELSE 0 END) as funded,
        SUM(balance_sats) as total_sats_distributed
       FROM attendees WHERE event_id = ?`
    )
    .get(id);

  return c.json({
    event: sanitizeEvent(event),
    stats: {
      totalAttendees: stats.total_attendees || 0,
      onboarded: stats.onboarded || 0,
      funded: stats.funded || 0,
      totalSatsDistributed: stats.total_sats_distributed || 0,
    },
  });
});

// ── GET /api/events/:id/attendees — list attendees for event ──
events.get("/:id/attendees", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const event = db.prepare("SELECT id FROM events WHERE id = ?").get(id);
  if (!event) {
    return c.json({ error: "Evento no encontrado" }, 404);
  }

  const rows = db
    .prepare(
      `SELECT id, display_name, lightning_address, balance_sats,
              welcome_funded, missions_completed, onboarding_complete,
              nwc_url, wallet_pubkey,
              created_at, last_seen_at
       FROM attendees WHERE event_id = ? ORDER BY created_at DESC`
    )
    .all(id);

  return c.json({
    attendees: rows.map((a) => ({
      id: a.id,
      displayName: a.display_name,
      lightningAddress: a.lightning_address,
      balanceSats: a.balance_sats,
      welcomeFunded: !!a.welcome_funded,
      missionsCompleted: JSON.parse(a.missions_completed || "[]"),
      onboardingComplete: !!a.onboarding_complete,
      nwcUrl: a.nwc_url || null,
      walletPubkey: a.wallet_pubkey || null,
      createdAt: a.created_at,
      lastSeenAt: a.last_seen_at,
    })),
  });
});

// ── PATCH /api/events/:id — update event ──
events.patch("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");
  const body = await c.req.json();

  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(id);
  if (!event) {
    return c.json({ error: "Evento no encontrado" }, 404);
  }

  // Build dynamic update
  const allowed = [
    "name",
    "date",
    "welcomeSats",
    "maxAttendees",
    "albyHubUrl",
    "albyAuthToken",
    "status",
  ];
  const dbFieldMap = {
    name: "name",
    date: "date",
    welcomeSats: "welcome_sats",
    maxAttendees: "max_attendees",
    albyHubUrl: "alby_hub_url",
    albyAuthToken: "alby_auth_token",
    status: "status",
  };

  const sets = [];
  const values = [];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      sets.push(`${dbFieldMap[key]} = ?`);
      values.push(body[key]);
    }
  }

  if (sets.length === 0) {
    return c.json({ error: "Nada que actualizar" }, 400);
  }

  values.push(id);
  db.prepare(`UPDATE events SET ${sets.join(", ")} WHERE id = ?`).run(
    ...values
  );

  const updated = db.prepare("SELECT * FROM events WHERE id = ?").get(id);
  return c.json({ event: sanitizeEvent(updated) });
});

// ── DELETE /api/events/:id — soft delete (set status = 'archived') ──
events.delete("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const event = db.prepare("SELECT id FROM events WHERE id = ?").get(id);
  if (!event) {
    return c.json({ error: "Evento no encontrado" }, 404);
  }

  db.prepare("UPDATE events SET status = 'archived' WHERE id = ?").run(id);
  return c.json({ message: "Evento archivado" });
});

/**
 * Strip sensitive fields from event object before sending to client
 */
function sanitizeEvent(event) {
  return {
    id: event.id,
    name: event.name,
    date: event.date,
    code: event.code,
    welcomeSats: event.welcome_sats,
    maxAttendees: event.max_attendees,
    status: event.status,
    createdAt: event.created_at,
    // Don't expose alby credentials in API responses
    hasAlbyConfig: !!(event.alby_hub_url && event.alby_auth_token),
  };
}

export default events;
