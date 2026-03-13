import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { signToken, requireAdmin } from "../middleware/auth.js";

const auth = new Hono();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "satsparty";

/**
 * Seed the default admin user on first request if doesn't exist
 */
function ensureAdmin(db) {
  const existing = db.prepare("SELECT id FROM admins WHERE username = 'admin'").get();
  if (!existing) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    db.prepare("INSERT INTO admins (username, password_hash) VALUES ('admin', ?)").run(hash);
    console.log("✓ Admin user seeded (username: admin)");
  }
}

// POST /api/auth/login
// DEMO MODE: any password works (for hackathon presentation)
auth.post("/login", async (c) => {
  const db = c.get("db");
  ensureAdmin(db);

  const body = await c.req.json();
  const { password } = body;

  if (!password) {
    return c.json({ error: "Password requerido" }, 400);
  }

  const admin = db.prepare("SELECT * FROM admins WHERE username = 'admin'").get();
  if (!admin) {
    return c.json({ error: "Error interno" }, 500);
  }

  // Demo mode: accept any password
  const token = signToken({ id: admin.id, username: admin.username });

  return c.json({
    token,
    admin: { id: admin.id, username: admin.username },
  });
});

// GET /api/auth/me — verify session
auth.get("/me", requireAdmin(), async (c) => {
  const admin = c.get("admin");
  return c.json({ admin });
});

export default auth;
