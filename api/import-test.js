export default async function handler(req, res) {
  const steps = [];
  try {
    let t;

    t = Date.now();
    await import("hono");
    steps.push(`hono: ${Date.now() - t}ms`);

    t = Date.now();
    await import("hono/vercel");
    steps.push(`hono/vercel: ${Date.now() - t}ms`);

    t = Date.now();
    await import("jsonwebtoken");
    steps.push(`jsonwebtoken: ${Date.now() - t}ms`);

    t = Date.now();
    await import("nanoid");
    steps.push(`nanoid: ${Date.now() - t}ms`);

    t = Date.now();
    await import("nostr-tools/pure");
    steps.push(`nostr-tools/pure: ${Date.now() - t}ms`);

    t = Date.now();
    await import("@neondatabase/serverless");
    steps.push(`neon: ${Date.now() - t}ms`);

    res.status(200).json({ ok: true, steps });
  } catch (err) {
    steps.push(`ERROR: ${err.message}`);
    res.status(500).json({ ok: false, steps, error: err.message });
  }
}
