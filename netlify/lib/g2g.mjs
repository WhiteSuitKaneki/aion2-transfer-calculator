// Shared G2G helpers: live offers for AION 2 kinah on one server (USD per 1M kinah),
// plus a price history per server kept in Netlify Blobs, since G2G doesn't publish one.
import { getStore } from "@netlify/blobs";
import SERVERS from "../../servers.json";

const SEARCH = "https://sls.g2g.com/v3/offer/search?region_id={region}&filter_attr={attr}&sort={sort}" +
  "&seo_term=aion-2-kinah&page_size=20&group=0&currency=USD&country=US&v=v2";
const KEEP_SECONDS = 8 * 86400;
const MIN_GAP_SECONDS = 25 * 60; // at most about two snapshots an hour

export const DEFAULT_SERVER = SERVERS.default;
// the server's entry, or null when it's unknown or has no G2G listing
export function serverInfo(id) {
  const s = SERVERS.servers.find(x => x.id === Number(id));
  return s?.g2g ? s : null;
}

async function offers(server, sort) {
  const url = SEARCH.replace("{region}", server.g2g.region).replace("{attr}", encodeURIComponent(server.g2g.attr)).replace("{sort}", sort);
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (personal price check)" } });
  if (!res.ok) throw new Error(`G2G HTTP ${res.status}`);
  const results = (await res.json())?.payload?.results || [];
  return results
    .filter(o => o.converted_unit_price || o.unit_price)
    .map(o => ({ seller: o.username, price: o.converted_unit_price || o.unit_price,
                 satisfaction: o.satisfaction_rate, orders: o.total_success_order, level: o.user_level }));
}

// same rule as the page: at least 95% satisfaction and 20 completed orders
const trusted = o => (o.satisfaction || 0) >= 0.95 && (o.orders || 0) >= 20;

export async function liveRate(server) {
  const [recommended, lowest] = await Promise.all([offers(server, "recommended_v4"), offers(server, "lowest_price")]);
  return { server: server.id, recommended, lowest, at: Math.floor(Date.now() / 1000) };
}

const store = () => getStore("g2g-history");
// Siel NA West keeps the key it had before other servers were added, so its history carries on
const key = server => (server.id === 11201 ? "siel-elyos-naw" : `server-${server.id}`);

export async function readHistory(server) {
  return (await store().get(key(server), { type: "json" })) || [];
}

// Adds {at, recommended, trusted, lowest} unless the last snapshot is very recent; returns the history.
export async function recordSnapshot(server, rate) {
  const history = await readHistory(server);
  const last = history[history.length - 1];
  if (last && rate.at - last.at < MIN_GAP_SECONDS) return history;
  history.push({ at: rate.at, recommended: rate.recommended[0]?.price ?? null,
                 trusted: rate.lowest.find(trusted)?.price ?? null, lowest: rate.lowest[0]?.price ?? null });
  const kept = history.filter(h => rate.at - h.at <= KEEP_SECONDS);
  await store().setJSON(key(server), kept);
  return kept;
}
