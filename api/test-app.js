// Test: does hono/vercel handle() work at all?
export default async function handler(req, res) {
  try {
    const t1 = Date.now();
    const { Hono } = await import("hono");
    const { handle } = await import("hono/vercel");

    const app = new Hono();
    app.get("/api/test-app", (c) => c.json({ ok: true, time: Date.now() - t1 }));

    const h = handle(app);
    return h(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
