// /g2g/rate?server=<aion2.exchange server id>: G2G's recommended and cheapest AION 2 kinah offers for that server
// (USD per 1M kinah), with the recorded price history for the trend arrows. Defaults to Siel - Elyos [NA West].
import { liveRate, recordSnapshot, readHistory, serverInfo, DEFAULT_SERVER } from "../lib/g2g.mjs";

export default async (req) => {
  const server = serverInfo(new URL(req.url).searchParams.get("server") || DEFAULT_SERVER);
  if (!server) return Response.json({ error: "unknown server" }, { status: 400 });
  try {
    const rate = await liveRate(server);
    let history = [];
    try { history = await recordSnapshot(server, rate); } catch { history = await readHistory(server).catch(() => []); }
    return Response.json({ ...rate, history }, {
      headers: { "Netlify-CDN-Cache-Control": "public, s-maxage=600, stale-while-revalidate=600, durable", "Netlify-Vary": "query=server" },
    });
  } catch (e) {
    return Response.json({ error: `${e.name}: ${e.message}` }, { status: 502 });
  }
};

export const config = { path: "/g2g/rate" };
