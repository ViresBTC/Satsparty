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
import lnurlpRoutes from "./routes/lnurlp.js";

// ── Init ──
const app = new Hono();

// DB promise (lazy init, cached)
let dbPromise = null;

// ── Middleware ──
app.use("*", logger());
app.use("/api/*", cors());

// ── Health Check (no DB needed) ──
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    app: "SatsParty Backend",
    runtime: process.env.VERCEL ? "vercel" : "local",
    timestamp: new Date().toISOString(),
  });
});

// Routes that DON'T need DB (prices fetches live, no DB required)
app.route("/api/prices", priceRoutes);

// DB middleware — only for routes that need it
const dbMiddleware = async (c, next) => {
  if (!dbPromise) dbPromise = initDB();
  const db = await dbPromise;
  c.set("db", db);
  await next();
};

app.use("/api/auth/*", dbMiddleware);
app.use("/api/events/*", dbMiddleware);
app.use("/api/onboard/*", dbMiddleware);
app.use("/api/attendees/*", dbMiddleware);
app.use("/.well-known/*", dbMiddleware);

// ── Routes (DB-dependent) ──
app.route("/api/auth", authRoutes);
app.route("/api/events", eventRoutes);
app.route("/api/onboard", onboardRoutes);
app.route("/api/attendees", attendeeRoutes);
app.route("/.well-known/lnurlp", lnurlpRoutes);

export default app;
