// Step-by-step diagnostic to find what hangs on Vercel
export default async function handler(req, res) {
  const steps = [];

  try {
    steps.push("start");

    // Step 1: Hono
    const t1 = Date.now();
    const { Hono } = await import("hono");
    steps.push(`hono: ${Date.now() - t1}ms`);

    // Step 2: hono/vercel
    const t2 = Date.now();
    await import("hono/vercel");
    steps.push(`hono/vercel: ${Date.now() - t2}ms`);

    // Step 3: sql.js
    const t3 = Date.now();
    const sqljs = await import("sql.js");
    steps.push(`sql.js import: ${Date.now() - t3}ms`);

    // Step 4: init sql.js
    const t4 = Date.now();
    const SQL = await sqljs.default();
    steps.push(`sql.js init: ${Date.now() - t4}ms`);

    // Step 5: @getalby/sdk
    const t5 = Date.now();
    await import("@getalby/sdk");
    steps.push(`@getalby/sdk: ${Date.now() - t5}ms`);

    res.status(200).json({ ok: true, steps });
  } catch (err) {
    steps.push(`ERROR: ${err.message}`);
    res.status(500).json({ ok: false, steps, error: err.message, stack: err.stack?.split("\n").slice(0, 5) });
  }
}
