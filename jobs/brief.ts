/**
 * Morning Brief — the one place an LLM is used. It turns already-computed scores into a short
 * Indonesian paragraph and never produces or changes a number; the template in
 * `scoring/brief.ts` is the fallback whenever the model can't be reached.
 */
import Anthropic from "@anthropic-ai/sdk";
import { isMock } from "../ingest/client";
import { briefFacts, templateBrief } from "../scoring/brief";
import type { SectorScore, Snapshot } from "../scoring/types";

const MODEL = "claude-opus-5";

const SYSTEM = `Kamu menulis "Ringkasan Pagi" untuk dasbor Divergence: skor perhatian sektor IDX berdasarkan keterkaitan dengan bursa Singapura.

Aturan:
- Tulis satu paragraf bahasa Indonesia, 3–5 kalimat, untuk investor ritel yang tidak terbiasa statistik.
- Gunakan hanya fakta di JSON yang diberikan. Jangan menambah angka, perusahaan, berita, atau alasan yang tidak ada di sana.
- Sebut sektor dengan urutan peringkatnya dan jelaskan pendorongnya (keterkaitan struktural, pemicu berita, aliran transaksi orang dalam).
- Jika sensitivitas historis tidak signifikan, katakan bahwa keterkaitannya belum terbukti di data harga.
- Ini skor perhatian, bukan rekomendasi: jangan menyarankan membeli, menjual, atau menahan saham.`;

const hasCredentials = () =>
  process.env.BRIEF_LLM !== "0" &&
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);

export async function composeBrief(sectors: SectorScore[]): Promise<Snapshot["brief"]> {
  const fallback = { text: templateBrief(sectors), by: "template" as const };
  // Mock data never reaches a paid model.
  if (isMock() || !hasCredentials()) return fallback;

  try {
    const client = new Anthropic();
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify({ sektorTeratas: briefFacts(sectors) }) }],
    });
    if (res.stop_reason === "refusal") return fallback;
    const text = res.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return text ? { text, by: "llm", model: res.model } : fallback;
  } catch (e) {
    console.warn(`brief: LLM unavailable, using template (${e instanceof Error ? e.message : e})`);
    return fallback;
  }
}
