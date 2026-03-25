let handler;

export default async function (req, res) {
  try {
    if (!handler) {
      const { Hono } = await import("hono");
      const { handle } = await import("hono/vercel");
      const { default: authRoutes } = await import("../../server/routes/auth.js");
      const { initDB } = await import("../../server/db.js");

      const app = new Hono();
      let dbPromise = null;

      app.use("*", async (c, next) => {
        if (!dbPromise) dbPromise = initDB();
        c.set("db", await dbPromise);
        await next();
      });

      app.route("/api/auth", authRoutes);
      handler = handle(app);
    }
    return handler(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
