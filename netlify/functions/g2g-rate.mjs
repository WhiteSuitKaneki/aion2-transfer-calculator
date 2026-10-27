// /g2g/rate: G2G's recommended and cheapest AION 2 kinah offers for Siel - Elyos [NA West] (USD per 1M kinah),
// with the recorded price history for the trend arrows.
import { liveRate, recordSnapshot, readHistory } from "../lib/g2g.mjs";

export default async () => {
  try {
    const rate = await liveRate();
    let history = [];
    try { history = await recordSnapshot(rate); } catch { history = await readHistory().catch(() => []); }
    return Response.json({ ...rate, history }, {
      headers: { "Netlify-CDN-Cache-Control": "public, s-maxage=600, stale-while-revalidate=600, durable" },
    });
  } catch (e) {
    return Response.json({ error: `${e.name}: ${e.message}` }, { status: 502 });
  }
};

export const config = { path: "/g2g/rate" };
