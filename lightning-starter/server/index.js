// ═══════════════════════════════════════
//  SatsParty — Dev Server (local only)
// ═══════════════════════════════════════

import { serve } from "@hono/node-server";
import app from "./app.js";

const port = parseInt(process.env.PORT || "3001");

serve({ fetch: app.fetch, port }, () => {
  console.log(`⚡ SatsParty backend running on http://localhost:${port}`);
});
