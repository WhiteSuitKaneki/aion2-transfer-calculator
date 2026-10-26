// Relays /api/* to aion2.exchange (the browser can't call it directly) and caches results for 10 minutes.
const UPSTREAM = process.env.AION2_UPSTREAM || "https://aion2.exchange";

export default async (req) => {
  const url = new URL(req.url);
  try {
    const res = await fetch(UPSTREAM + url.pathname + url.search, {
      headers: { "User-Agent": "aion2-transfer-crafting-calculator/0.1 (personal use)" },
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        ...(res.ok && { "Netlify-CDN-Cache-Control": "public, s-maxage=600, stale-while-revalidate=600, durable" }),
      },
    });
  } catch (e) {
    return Response.json({ error: `${e.name}: ${e.message}` }, { status: 502 });
  }
};

export const config = { path: "/api/*" };
