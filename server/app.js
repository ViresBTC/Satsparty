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
import walletRoutes from "./routes/wallet.js";
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

// Prices route BEFORE DB middleware (doesn't need DB)
app.route("/api/prices", priceRoutes);

// DB middleware — lazy init, cached
app.use("/api/*", async (c, next) => {
  // Skip if already set (prices route doesn't need it)
  if (c.get("db")) return next();
  if (!dbPromise) dbPromise = initDB();
  const db = await dbPromise;
  c.set("db", db);
  await next();
});

app.use("/.well-known/*", async (c, next) => {
  if (!dbPromise) dbPromise = initDB();
  const db = await dbPromise;
  c.set("db", db);
  await next();
});

// ── Routes ──
app.route("/api/auth", authRoutes);
app.route("/api/events", eventRoutes);
app.route("/api/onboard", onboardRoutes);
app.route("/api/attendees", attendeeRoutes);
app.route("/api/wallet", walletRoutes);
app.route("/.well-known/lnurlp", lnurlpRoutes);

export default app;
