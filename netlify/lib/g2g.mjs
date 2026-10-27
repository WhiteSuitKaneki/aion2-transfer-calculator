// Shared G2G helpers: live offers for AION 2 kinah, Siel - Elyos [NA West] (USD per 1M kinah),
// plus a price history kept in Netlify Blobs, since G2G doesn't publish one.
import { getStore } from "@netlify/blobs";

const SEARCH = "https://sls.g2g.com/v3/offer/search?region_id=dfced32f-2f0a-4df5-a218-1e068cfadffa" +
  "&filter_attr=lgc_37781_dropdown_11:lgc_37781_dropdown_11_64650&sort={sort}" +
  "&seo_term=aion-2-kinah&page_size=20&group=0&currency=USD&country=US&v=v2";
const KEEP_SECONDS = 8 * 86400;
const MIN_GAP_SECONDS = 25 * 60; // at most about two snapshots an hour

async function offers(sort) {
  const res = await fetch(SEARCH.replace("{sort}", sort), { headers: { "User-Agent": "Mozilla/5.0 (personal price check)" } });
  if (!res.ok) throw new Error(`G2G HTTP ${res.status}`);
  const results = (await res.json())?.payload?.results || [];
  return results
    .filter(o => o.converted_unit_price || o.unit_price)
    .map(o => ({ seller: o.username, price: o.converted_unit_price || o.unit_price,
                 satisfaction: o.satisfaction_rate, orders: o.total_success_order, level: o.user_level }));
}

// same rule as the page: at least 95% satisfaction and 20 completed orders
const trusted = o => (o.satisfaction || 0) >= 0.95 && (o.orders || 0) >= 20;

export async function liveRate() {
  const [recommended, lowest] = await Promise.all([offers("recommended_v4"), offers("lowest_price")]);
  return { recommended, lowest, at: Math.floor(Date.now() / 1000) };
}

const store = () => getStore("g2g-history");

export async function readHistory() {
  return (await store().get("siel-elyos-naw", { type: "json" })) || [];
}

// Adds {at, recommended, trusted, lowest} unless the last snapshot is very recent; returns the history.
export async function recordSnapshot(rate) {
  const history = await readHistory();
  const last = history[history.length - 1];
  if (last && rate.at - last.at < MIN_GAP_SECONDS) return history;
  history.push({ at: rate.at, recommended: rate.recommended[0]?.price ?? null,
                 trusted: rate.lowest.find(trusted)?.price ?? null, lowest: rate.lowest[0]?.price ?? null });
  const kept = history.filter(h => rate.at - h.at <= KEEP_SECONDS);
  await store().setJSON("siel-elyos-naw", kept);
  return kept;
}
