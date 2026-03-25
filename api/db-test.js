// Diagnostic: test Neon DB connection
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const steps = [];

  try {
    steps.push("start");

    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    steps.push(`env: ${dbUrl ? "found (" + dbUrl.slice(0, 30) + "...)" : "MISSING"}`);

    if (!dbUrl) {
      return res.status(500).json({ ok: false, steps, error: "DATABASE_URL not set" });
    }

    const t1 = Date.now();
    const { neon } = await import("@neondatabase/serverless");
    steps.push(`neon import: ${Date.now() - t1}ms`);

    const t2 = Date.now();
    const sql = neon(dbUrl);
    steps.push(`neon init: ${Date.now() - t2}ms`);

    const t3 = Date.now();
    const result = await sql`SELECT 1 as test`;
    steps.push(`query: ${Date.now() - t3}ms`);
    steps.push(`result: ${JSON.stringify(result)}`);

    res.status(200).json({ ok: true, steps });
  } catch (err) {
    steps.push(`ERROR: ${err.message}`);
    res.status(500).json({ ok: false, steps, error: err.message });
  }
}
