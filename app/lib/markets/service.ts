/**
 * Server-side assembly for /api/markets/*. Picks sectors.app when SECTORS_API_KEY is set and
 * falls back to the labelled sample otherwise — or when sectors.app errors, so a quota or
 * outage degrades to "contoh" instead of a blank page.
 */
import { betaFromCloses, stakeBeta } from "./domino";
import { SEED_LINKS } from "./links";
import { sampleNews, sampleUniverse } from "./sample";
import { fetchCloses, fetchMiningTree, fetchNews, fetchOwnership, fetchUniverse, hasSectorsKey } from "./sectorsApp";
import type { CrossLink, DataSource, LinksPayload, MarketOverview, NewsItem, SectorSlug, Stock } from "./types";

const now = () => new Date().toISOString();

function sampleSource(note?: string): DataSource {
  return {
    provider: "contoh",
    fetchedAt: now(),
    note: note ?? "SECTORS_API_KEY belum dipasang — angka dan berita di bawah adalah contoh.",
  };
}

const errNote = (e: unknown) =>
  `sectors.app tidak bisa dihubungi (${e instanceof Error ? e.message.slice(0, 120) : "galat"}) — menampilkan data contoh.`;

/* ── overview ── */

export async function getOverview(): Promise<MarketOverview> {
  if (!hasSectorsKey()) return { source: sampleSource(), ...sampleUniverse() };
  try {
    const [idx, sgx] = await Promise.all([fetchUniverse("IDX"), fetchUniverse("SGX")]);
    return { source: { provider: "sectors.app", fetchedAt: now() }, idx, sgx };
  } catch (e) {
    return { source: sampleSource(errNote(e)), ...sampleUniverse() };
  }
}

/* ── news ── */

export async function getNews(opts: { sector?: SectorSlug; symbols?: string[] }): Promise<{
  source: DataSource;
  news: NewsItem[];
}> {
  const filter = (items: NewsItem[]) => {
    const wanted = new Set(opts.symbols?.map((s) => s.toUpperCase()));
    return items.filter((n) => {
      const bySymbol = wanted.size > 0 && n.symbols.some((s) => wanted.has(s));
      const bySector = !opts.sector || n.sector === opts.sector;
      return opts.symbols?.length ? bySymbol || (opts.sector ? n.sector === opts.sector : false) : bySector;
    });
  };

  if (!hasSectorsKey()) return { source: sampleSource(), news: filter(sampleNews()) };

  try {
    const idxSyms = opts.symbols?.filter((s) => /\.JK$/i.test(s)) ?? [];
    const sgxSyms = opts.symbols?.filter((s) => /\.SI$/i.test(s)) ?? [];
    const week = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const batches = await Promise.all([
      fetchNews("IDX"),
      fetchNews("SGX"),
      idxSyms.length ? fetchNews("IDX", { symbols: idxSyms, start: week, pages: 1 }) : [],
      sgxSyms.length ? fetchNews("SGX", { symbols: sgxSyms, start: week, pages: 1 }) : [],
    ]);
    const seen = new Set<string>();
    const merged = batches
      .flat()
      .filter((n) => {
        const key = n.url ?? n.title;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return { source: { provider: "sectors.app", fetchedAt: now() }, news: filter(merged) };
  } catch (e) {
    return { source: sampleSource(errNote(e)), news: filter(sampleNews()) };
  }
}

/* ── links ── */

/** Legal suffixes and filler that differ between an SGX listing name and a shareholder entry. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b(pt|tbk|ltd|limited|pte|plc|inc|corp|corporation|holdings?|group|the|co)\b\.?/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * An SGX company "appears" in a shareholder name when all of its distinctive words do —
 * "Jardine Cycle & Carriage" matches "Jardine Cycle & Carriage Limited". Single-word names
 * need an exact match to avoid "Keppel" catching every Keppel entity.
 */
function matchSgx(holder: string, sgx: Stock[]): Stock | null {
  const h = norm(holder);
  for (const s of sgx) {
    const n = norm(s.name);
    const words = n.split(" ").filter((w) => w.length > 2);
    if (!words.length) continue;
    if (words.length === 1 ? h === n : words.every((w) => h.includes(w))) return s;
  }
  return null;
}

const SCAN = Number(process.env.SECTORS_LINK_SCAN ?? 25);

export async function getLinks(): Promise<LinksPayload> {
  const overview = await getOverview();
  const all = [...overview.idx, ...overview.sgx];
  const names: Record<string, string> = Object.fromEntries(all.map((s) => [s.symbol, s.name]));
  const people: LinksPayload["people"] = {};
  let links: CrossLink[] = [...SEED_LINKS];
  let source = overview.source;

  if (overview.source.provider === "sectors.app") {
    try {
      // Every IDX emiten already in the graph, plus the largest caps — one report each, cached a day.
      const graphIdx = new Set(SEED_LINKS.flatMap((l) => [l.from, l.to]).filter((s) => s.endsWith(".JK")));
      const top = [...overview.idx]
        .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
        .slice(0, SCAN)
        .map((s) => s.symbol);
      const scan = [...new Set([...graphIdx, ...top])];
      const reports = await Promise.allSettled(scan.map((s) => fetchOwnership(s)));

      const addLink = (l: CrossLink) => {
        if (!links.some((x) => x.id === l.id)) links.push(l);
      };

      for (const r of reports) {
        if (r.status !== "fulfilled") continue;
        const o = r.value;
        if (o.executives.length) people[o.symbol] = o.executives;
        for (const h of o.majorShareholders) {
          const hit = matchSgx(h.name, overview.sgx);
          if (!hit) continue;
          const id = `${hit.symbol}>${o.symbol}`;
          if (links.some((l) => l.id === id)) continue;
          const stake = h.share !== null ? (h.share > 1 ? h.share / 100 : h.share) : null;
          addLink({
            id,
            from: hit.symbol,
            to: o.symbol,
            relation: stake !== null && stake >= 0.5 ? "pengendali" : "pemegang-saham",
            stake,
            basis: `${h.name} tercatat sebagai pemegang saham utama ${names[o.symbol] ?? o.symbol}`,
            origin: "otomatis",
          });
        }
      }

      /*
       * The mining extension is the only endpoint that returns a corporate structure rather than
       * a shareholder list, so it catches parents held through an unlisted vehicle that the
       * shareholder names above miss. Only energy / basic-materials emiten are worth the lookup.
       */
      const miners = overview.idx.filter(
        (s) => scan.includes(s.symbol) && (s.sector === "energy" || s.sector === "basic-materials"),
      );
      const trees = await Promise.allSettled(
        miners.map(async (s) => [s.symbol, await fetchMiningTree(s.symbol)] as const),
      );

      for (const t of trees) {
        if (t.status !== "fulfilled" || !t.value[1]) continue;
        const [symbol, tree] = t.value;
        for (const p of tree.parents) {
          // A parent is an edge only when it is itself listed on either board, or matches an SGX name.
          const hit = p.symbol && names[p.symbol] ? p.symbol : (matchSgx(p.name, overview.sgx)?.symbol ?? null);
          if (!hit || hit === symbol) continue;
          addLink({
            id: `${hit}>${symbol}`,
            from: hit,
            to: symbol,
            relation: p.stake !== null && p.stake >= 0.5 ? "pengendali" : "pemegang-saham",
            stake: p.stake,
            basis: `${p.name} tercatat sebagai induk ${names[symbol] ?? symbol} di data kepemilikan tambang sectors.app`,
            origin: "otomatis",
          });
        }
        for (const sub of tree.subsidiaries) {
          if (!sub.symbol || !names[sub.symbol] || sub.symbol === symbol) continue;
          addLink({
            id: `${symbol}>${sub.symbol}`,
            from: symbol,
            to: sub.symbol,
            relation: "anak-usaha",
            stake: sub.stake,
            basis: `${sub.name} tercatat sebagai anak usaha ${names[symbol] ?? symbol} di data kepemilikan tambang sectors.app`,
            origin: "otomatis",
          });
        }
      }
    } catch (e) {
      source = { ...source, note: `Deteksi otomatis gagal: ${e instanceof Error ? e.message.slice(0, 100) : "galat"}` };
    }
  }

  // Only keep edges whose endpoints we can name — a stale seed ticker should not render as a bare code.
  links = links.filter((l) => names[l.from] && names[l.to]);

  const sensitivity = await Promise.all(
    links.map(async (l) => {
      if (overview.source.provider === "sectors.app") {
        try {
          const [a, b] = await Promise.all([fetchCloses(l.from), fetchCloses(l.to)]);
          const fit = betaFromCloses(a, b);
          if (fit) return { linkId: l.id, ...fit };
        } catch {
          /* fall through to the stake estimate */
        }
      }
      return { linkId: l.id, beta: stakeBeta(l), correlation: 0, days: 0 };
    }),
  );

  return { source, links, sensitivity, names, people };
}
