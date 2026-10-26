// /g2g/rate: G2G's recommended and cheapest AION 2 kinah offers for Siel - Elyos [NA West] (USD per 1M kinah).
const SEARCH = "https://sls.g2g.com/v3/offer/search?region_id=dfced32f-2f0a-4df5-a218-1e068cfadffa" +
  "&filter_attr=lgc_37781_dropdown_11:lgc_37781_dropdown_11_64650&sort={sort}" +
  "&seo_term=aion-2-kinah&page_size=20&group=0&currency=USD&country=US&v=v2";

async function offers(sort) {
  const res = await fetch(SEARCH.replace("{sort}", sort), { headers: { "User-Agent": "Mozilla/5.0 (personal price check)" } });
  if (!res.ok) throw new Error(`G2G HTTP ${res.status}`);
  const results = (await res.json())?.payload?.results || [];
  return results
    .filter(o => o.converted_unit_price || o.unit_price)
    .map(o => ({ seller: o.username, price: o.converted_unit_price || o.unit_price,
                 satisfaction: o.satisfaction_rate, orders: o.total_success_order, level: o.user_level }));
}

export default async () => {
  try {
    const [recommended, lowest] = await Promise.all([offers("recommended_v4"), offers("lowest_price")]);
    return Response.json({ recommended, lowest, at: Math.floor(Date.now() / 1000) }, {
      headers: { "Netlify-CDN-Cache-Control": "public, s-maxage=600, stale-while-revalidate=600, durable" },
    });
  } catch (e) {
    return Response.json({ error: `${e.name}: ${e.message}` }, { status: 502 });
  }
};

export const config = { path: "/g2g/rate" };
