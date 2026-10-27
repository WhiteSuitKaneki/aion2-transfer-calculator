// Runs every hour on Netlify so the G2G price history keeps growing even when nobody has the page open.
import { liveRate, recordSnapshot } from "../lib/g2g.mjs";

export default async () => {
  await recordSnapshot(await liveRate());
};

export const config = { schedule: "@hourly" };
