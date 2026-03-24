import { Hono } from "hono";
import { verifyEvent } from "nostr-tools/pure";
import { signToken, requireAdmin } from "../middleware/auth.js";

const auth = new Hono();

/**
 * Ensure admin record exists in DB.
 * First Nostr key to log in becomes the admin.
 */
async function getOrCreateAdmin(db, pubkey) {
  // Check if this pubkey is already admin
  let admin = await db
    .prepare("SELECT * FROM admins WHERE username = ?")
    .get(pubkey);

  if (admin) return admin;

  // Check if ANY admin exists
  const anyAdmin = await db.prepare("SELECT * FROM admins LIMIT 1").get();

  if (!anyAdmin) {
    // First login ever — this pubkey becomes admin
    await db.prepare(
      "INSERT INTO admins (username, password_hash) VALUES (?, 'nostr')"
    ).run(pubkey);
    console.log(`⚡ Admin registrado: ${pubkey.slice(0, 12)}...`);
    return await db.prepare("SELECT * FROM admins WHERE username = ?").get(pubkey);
  }

  // Admin exists but different pubkey
  return null;
}

// POST /api/auth/nostr — login with signed Nostr event
auth.post("/nostr", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const { event } = body;

  if (!event) {
    return c.json({ error: "Evento Nostr requerido" }, 400);
  }

  // Verify the Nostr event signature
  const isValid = verifyEvent(event);
  if (!isValid) {
    return c.json({ error: "Firma inválida" }, 401);
  }

  // Check event is recent (within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - event.created_at) > 300) {
    return c.json({ error: "Evento expirado" }, 401);
  }

  const pubkey = event.pubkey;

  // Get or register admin
  const admin = await getOrCreateAdmin(db, pubkey);
  if (!admin) {
    return c.json(
      { error: "Esta clave no tiene permisos de administrador" },
      403
    );
  }

  const token = signToken({
    id: admin.id,
    username: admin.username,
    pubkey,
  });

  return c.json({
    token,
    admin: {
      id: admin.id,
      pubkey,
      npubShort: pubkey.slice(0, 8) + "..." + pubkey.slice(-4),
    },
  });
});

// POST /api/auth/login — legacy demo login (any password)
auth.post("/login", async (c) => {
  const db = c.get("db");
  const body = await c.req.json();
  const { password } = body;

  if (!password) {
    return c.json({ error: "Password requerido" }, 400);
  }

  // Demo fallback: create generic admin if none exists
  let admin = await db.prepare("SELECT * FROM admins LIMIT 1").get();
  if (!admin) {
    await db.prepare(
      "INSERT INTO admins (username, password_hash) VALUES ('admin', 'demo')"
    ).run();
    admin = await db.prepare("SELECT * FROM admins LIMIT 1").get();
  }

  const token = signToken({ id: admin.id, username: admin.username });
  return c.json({ token, admin: { id: admin.id, username: admin.username } });
});

// GET /api/auth/me — verify session
auth.get("/me", requireAdmin(), async (c) => {
  const admin = c.get("admin");
  return c.json({ admin });
});

export default auth;
