import { Hono } from "hono";

const attendees = new Hono();

// GET /api/attendees/:id — get attendee data
attendees.get("/:id", async (c) => {
  return c.json({ message: "TODO: get attendee" }, 501);
});

// PATCH /api/attendees/:id — update attendee
attendees.patch("/:id", async (c) => {
  return c.json({ message: "TODO: update attendee" }, 501);
});

export default attendees;
