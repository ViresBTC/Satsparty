import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "satsparty-dev-secret-change-me";

/**
 * Generate a JWT for the admin
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

/**
 * Verify a JWT and return the payload
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Middleware: require admin JWT
 * Checks Authorization: Bearer <token> header
 */
export function requireAdmin() {
  return async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header || !header.startsWith("Bearer ")) {
      return c.json({ error: "No autorizado" }, 401);
    }

    try {
      const token = header.slice(7);
      const payload = verifyToken(token);
      c.set("admin", payload);
      await next();
    } catch {
      return c.json({ error: "Token inválido o expirado" }, 401);
    }
  };
}

/**
 * Middleware: require attendee token
 * Checks Authorization: Bearer <nanoid-token> header
 */
export function requireAttendee() {
  return async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header || !header.startsWith("Bearer ")) {
      return c.json({ error: "No autorizado" }, 401);
    }

    const token = header.slice(7);
    const db = c.get("db");
    const attendee = db.prepare("SELECT * FROM attendees WHERE token = ?").get(token);

    if (!attendee) {
      return c.json({ error: "Token de attendee inválido" }, 401);
    }

    // Update last seen
    db.prepare("UPDATE attendees SET last_seen_at = datetime('now') WHERE id = ?").run(attendee.id);
    c.set("attendee", attendee);
    await next();
  };
}
