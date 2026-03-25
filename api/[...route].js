// ═══════════════════════════════════════
//  SatsParty — Vercel Serverless Handler
// ═══════════════════════════════════════

import { handle } from "hono/vercel";
import app from "../server/app.js";

const honoHandler = handle(app);

export default async function handler(req, res) {
  console.log(`[route] ${req.method} ${req.url}`);
  try {
    return await honoHandler(req, res);
  } catch (err) {
    console.error("[route] Error:", err);
    res.status(500).json({ error: err.message });
  }
}
