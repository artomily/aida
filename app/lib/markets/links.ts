import type { CrossLink, LinkRelation } from "./types";

/**
 * Hand-maintained cross-border links — publicly documented ownership / group ties only.
 *
 * Stakes are approximate and drift with every placement or buyback: treat them as
 * orders of magnitude, and check the latest annual report or keterbukaan informasi
 * before quoting them. Board-level (direksi/komisaris) overlap follows from these control
 * relationships; the automatic detector in `service.ts` adds links it finds in each IDX
 * emiten's major-shareholder list.
 *
 * Edges point the way a shock travels (from → to). IDX → IDX edges are kept so a shock
 * can reach second-order subsidiaries (JC&C → Astra → United Tractors).
 */
export const SEED_LINKS: CrossLink[] = [
  link("J36.SI", "C07.SI", "pengendali", null, "Jardine Matheson adalah pemegang saham mayoritas Jardine Cycle & Carriage"),
  link("C07.SI", "ASII.JK", "pengendali", 0.5, "Jardine Cycle & Carriage memegang ±50% saham Astra International"),
  link("ASII.JK", "UNTR.JK", "anak-usaha", 0.6, "Astra memegang ±60% United Tractors"),
  link("ASII.JK", "AALI.JK", "anak-usaha", 0.8, "Astra memegang ±80% Astra Agro Lestari"),
  link("Z74.SI", "TLKM.JK", "pemegang-saham", null, "Singtel memiliki 35% Telkomsel, anak usaha utama Telkom Indonesia"),
  link("O39.SI", "NISP.JK", "pengendali", 0.85, "OCBC memegang ±85% Bank OCBC NISP"),
  link("E5H.SI", "SMAR.JK", "pengendali", 0.95, "Golden Agri-Resources (Sinar Mas) mengendalikan SMART Tbk"),
  link("A26.SI", "BSDE.JK", "pengendali", null, "Sinarmas Land mengendalikan Bumi Serpong Damai"),
  link("A26.SI", "DUTI.JK", "pengendali", null, "Sinarmas Land mengendalikan Duta Pertiwi"),
  link("INDF.JK", "5JS.SI", "pengendali", 0.74, "Indofood memegang ±74% Indofood Agri Resources (IndoAgri)"),
  link("5JS.SI", "SIMP.JK", "anak-usaha", 0.72, "IndoAgri memegang ±72% Salim Ivomas Pratama"),
  link("SIMP.JK", "LSIP.JK", "anak-usaha", 0.6, "Salim Ivomas memegang ±60% PP London Sumatra"),
  link("LPKR.JK", "D5IU.SI", "sponsor", null, "Lippo Karawaci adalah sponsor Lippo Malls Indonesia Retail Trust"),
  link("LJ3.SI", "LPKR.JK", "grup", null, "OUE dan Lippo Karawaci sama-sama berada di bawah Grup Lippo"),
];

function link(from: string, to: string, relation: LinkRelation, stake: number | null, basis: string): CrossLink {
  return { id: `${from}>${to}`, from, to, relation, stake, basis, origin: "kurasi" };
}

export const RELATION_LABEL: Record<LinkRelation, string> = {
  pengendali: "Pengendali",
  "anak-usaha": "Anak usaha",
  "pemegang-saham": "Pemegang saham",
  grup: "Satu grup",
  sponsor: "Sponsor REIT",
};
