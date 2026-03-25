export default async function handler(req, res) {
  const steps = [];
  try {
    let t;

    t = Date.now();
    await import("../server/routes/auth.js");
    steps.push(`auth routes: ${Date.now() - t}ms`);

    t = Date.now();
    await import("../server/db.js");
    steps.push(`db.js: ${Date.now() - t}ms`);

    t = Date.now();
    const { initDB } = await import("../server/db.js");
    const db = await initDB();
    steps.push(`initDB: ${Date.now() - t}ms`);

    t = Date.now();
    const result = await db.prepare("SELECT 1 as test").get();
    steps.push(`query: ${Date.now() - t}ms, result: ${JSON.stringify(result)}`);

    t = Date.now();
    await import("../server/routes/events.js");
    steps.push(`events routes: ${Date.now() - t}ms`);

    t = Date.now();
    await import("../server/app.js");
    steps.push(`full app.js: ${Date.now() - t}ms`);

    res.status(200).json({ ok: true, steps });
  } catch (err) {
    steps.push(`ERROR: ${err.message}`);
    res.status(500).json({ ok: false, steps, error: err.message, stack: err.stack?.split("\n").slice(0,5) });
  }
}
