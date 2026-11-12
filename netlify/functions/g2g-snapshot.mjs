// Runs every hour on Netlify so the default server's G2G price history keeps growing even when nobody has the page open.
// Other servers record a snapshot whenever someone loads the page with them selected.
import { liveRate, recordSnapshot, serverInfo, DEFAULT_SERVER } from "../lib/g2g.mjs";

export default async () => {
  const server = serverInfo(DEFAULT_SERVER);
  await recordSnapshot(server, await liveRate(server));
};

export const config = { schedule: "@hourly" };
