// ═══════════════════════════════════════
//  SatsParty — Hono App (shared between dev & Vercel)
// ═══════════════════════════════════════

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { initDB } from "./db.js";
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";
import onboardRoutes from "./routes/onboard.js";
import attendeeRoutes from "./routes/attendees.js";
import priceRoutes from "./routes/prices.js";

// ── Init ──
const app = new Hono();
const db = initDB();

// ── Middleware ──
app.use("*", logger());
app.use("/api/*", cors());

// Pass db to all routes via context
app.use("/api/*", async (c, next) => {
  c.set("db", db);
  await next();
});

// ── Routes ──
app.route("/api/auth", authRoutes);
app.route("/api/events", eventRoutes);
app.route("/api/onboard", onboardRoutes);
app.route("/api/attendees", attendeeRoutes);
app.route("/api/prices", priceRoutes);

// ── Health Check ──
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    app: "SatsParty Backend",
    timestamp: new Date().toISOString(),
  });
});

export default app;
