// Builds every sound in the teaser: voice-over (macOS `say`, Indonesian voice), synthesized
// sound effects, and a music bed timed to the scenes. Writes src/timeline.json, which the
// Remotion composition reads, so re-running this is all it takes after editing script.json.
//
//   npm run audio
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = JSON.parse(readFileSync(join(root, "src/script.json"), "utf8"));
const outDir = join(root, "public/audio");
const tmp = join(root, ".tmp");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, "vo"), { recursive: true });
mkdirSync(tmp, { recursive: true });

const FPS = script.fps;
const SR = 44100;
const MAX_FRAMES = 60 * FPS - 45; // stay comfortably under one minute

// ── voice-over ─────────────────────────────────────────────────────────────────────────────
const duration = (file) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());

const LEAD = 12; // frames of silence before a scene's first line
const GAP = 5; // frames between lines
const TAIL = 22; // frames after the last line before the next scene starts

let cursor = 0;
const scenes = script.scenes.map((scene) => {
  let t = LEAD;
  const lines = scene.lines.map((line, i) => {
    const name = `${scene.id}-${i}`;
    const aiff = join(tmp, `${name}.aiff`);
    const wav = join(outDir, "vo", `${name}.wav`);
    execFileSync("say", ["-v", script.voice, "-r", String(script.rate), "-o", aiff, line.speak ?? line.text]);
    // Trim the synthesizer's leading/trailing silence, warm it up a little, level it.
    execFileSync("ffmpeg", [
      "-y", "-v", "error", "-i", aiff,
      "-af",
      [
        "silenceremove=start_periods=1:start_threshold=-50dB",
        "areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse",
        "highpass=f=90",
        "equalizer=f=220:t=q:w=1:g=2",
        "equalizer=f=3500:t=q:w=1.2:g=2.5",
        "acompressor=threshold=-20dB:ratio=3:attack=5:release=80",
        "loudnorm=I=-15:TP=-1.5:LRA=7",
      ].join(","),
      "-ar", String(SR), "-ac", "1", wav,
    ]);
    const frames = Math.ceil(duration(wav) * FPS);
    if (i > 0) t += GAP;
    t += line.delay ?? 0;
    const entry = { text: line.text, file: `audio/vo/${name}.wav`, from: t, frames };
    t += frames;
    return entry;
  });
  const frames = Math.max(scene.minFrames, t + TAIL);
  const out = { id: scene.id, from: cursor, frames, lines };
  cursor += frames;
  return out;
});

const total = cursor + 30; // a one-second hold on the end card
console.log(`timeline: ${(total / FPS).toFixed(1)}s`);
for (const s of scenes) console.log(`  ${s.id.padEnd(8)} ${(s.from / FPS).toFixed(2)}s  +${(s.frames / FPS).toFixed(2)}s`);
if (total > MAX_FRAMES) {
  throw new Error(`Teaser is ${(total / FPS).toFixed(1)}s — over budget. Shorten script.json or raise the rate.`);
}
writeFileSync(join(root, "src/timeline.json"), JSON.stringify({ fps: FPS, total, scenes }, null, 2) + "\n");

// ── synthesis helpers ──────────────────────────────────────────────────────────────────────
function writeWav(file, left, right = left) {
  const n = left.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), 46 + i * 4);
  }
  writeFileSync(file, buf);
}

function normalize(buf, peak = 0.89) {
  let m = 0;
  for (const v of buf) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < buf.length; i++) buf[i] *= peak / m;
  return buf;
}

// Deterministic noise so re-renders sound identical.
let seed = 1337;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

/** State-variable filter; `cutoff(i)` may change per sample. Returns { low, band, high }. */
function svf(input, cutoff, q = 0.7) {
  const low = new Float32Array(input.length);
  const band = new Float32Array(input.length);
  const high = new Float32Array(input.length);
  let l = 0, b = 0;
  for (let i = 0; i < input.length; i++) {
    const f = 2 * Math.sin((Math.PI * Math.min(cutoff(i), SR / 6)) / SR);
    const h = input[i] - l - b / q;
    b += f * h;
    l += f * b;
    low[i] = l; band[i] = b; high[i] = h;
  }
  return { low, band, high };
}

const secs = (s) => Math.round(s * SR);
const noise = (n) => Float32Array.from({ length: n }, rand);
const env = (i, n, a, r) => Math.min(1, i / Math.max(1, secs(a))) * Math.min(1, (n - i) / Math.max(1, secs(r)));

// ── sound effects ──────────────────────────────────────────────────────────────────────────
const sfx = {};

sfx.whoosh = (() => {
  const n = secs(0.75);
  const { band } = svf(noise(n), (i) => 250 * Math.pow(18, Math.sin((Math.PI * i) / n)), 2.2);
  return normalize(band.map((v, i) => v * Math.pow(Math.sin((Math.PI * i) / n), 1.6)), 0.7);
})();

sfx.swish = (() => {
  const n = secs(0.35);
  const { band } = svf(noise(n), (i) => 1200 + 5000 * (i / n), 1.8);
  return normalize(band.map((v, i) => v * Math.pow(Math.sin((Math.PI * i) / n), 2)), 0.45);
})();

sfx.pop = (() => {
  const n = secs(0.12);
  let ph = 0;
  return normalize(Float32Array.from({ length: n }, (_, i) => {
    ph += (2 * Math.PI * (950 - 500 * (i / n))) / SR;
    return Math.sin(ph) * Math.exp(-i / secs(0.03));
  }), 0.55);
})();

sfx.tick = (() => {
  const n = secs(0.05);
  const { high } = svf(noise(n), () => 4000, 1.2);
  let ph = 0;
  return normalize(high.map((v, i) => {
    ph += (2 * Math.PI * 2400) / SR;
    return (v * 0.6 + Math.sin(ph) * 0.4) * Math.exp(-i / secs(0.008));
  }), 0.5);
})();

sfx.type = (() => {
  const n = secs(0.035);
  const { band } = svf(noise(n), () => 2800, 1.5);
  return normalize(band.map((v, i) => v * Math.exp(-i / secs(0.006))), 0.35);
})();

sfx.impact = (() => {
  const n = secs(1.6);
  const { low } = svf(noise(n), () => 400, 0.8);
  let ph = 0;
  return normalize(Float32Array.from({ length: n }, (_, i) => {
    ph += (2 * Math.PI * (38 + 42 * Math.exp(-i / secs(0.12)))) / SR;
    return Math.sin(ph) * Math.exp(-i / secs(0.45)) + low[i] * 1.8 * Math.exp(-i / secs(0.08));
  }), 0.95);
})();

sfx.riser = (() => {
  const n = secs(1.9);
  const { band } = svf(noise(n), (i) => 300 + 6000 * Math.pow(i / n, 2), 3);
  let ph = 0;
  return normalize(band.map((v, i) => {
    const p = i / n;
    ph += (2 * Math.PI * (180 + 700 * p * p)) / SR;
    return (v + Math.sin(ph) * 0.25) * Math.pow(p, 2.2) * Math.min(1, (n - i) / secs(0.02));
  }), 0.6);
})();

const bell = (freqs, len, decay) => {
  const n = secs(len);
  return normalize(Float32Array.from({ length: n }, (_, i) => {
    let v = 0;
    freqs.forEach(([f, a], k) => (v += a * Math.sin((2 * Math.PI * f * i) / SR) * Math.exp(-i / secs(decay / (1 + k * 0.6)))));
    return v * Math.min(1, i / 40);
  }), 0.5);
};
sfx.chime = bell([[1318.5, 1], [1975.5, 0.5], [2637, 0.3], [3520, 0.12]], 1.8, 0.7);
sfx.ding = (() => {
  const a = bell([[880, 1], [1760, 0.3]], 0.25, 0.12);
  const b = bell([[1318.5, 1], [2637, 0.3]], 0.9, 0.35);
  const out = new Float32Array(secs(0.08) + b.length);
  a.forEach((v, i) => (out[i] += v));
  b.forEach((v, i) => (out[i + secs(0.08)] += v));
  return normalize(out, 0.45);
})();
sfx.check = (() => {
  const a = bell([[987.8, 1], [1975.5, 0.25]], 0.18, 0.06);
  const b = bell([[1480, 1], [2960, 0.25]], 0.5, 0.15);
  const out = new Float32Array(secs(0.07) + b.length);
  a.forEach((v, i) => (out[i] += v));
  b.forEach((v, i) => (out[i + secs(0.07)] += v));
  return normalize(out, 0.4);
})();
sfx.miss = (() => {
  const n = secs(0.3);
  const { low } = svf(Float32Array.from({ length: n }, (_, i) => ((i * 150) / SR) % 1 * 2 - 1), () => 900, 0.9);
  return normalize(low.map((v, i) => v * Math.exp(-i / secs(0.09))), 0.35);
})();
sfx.glitch = (() => {
  const n = secs(0.45);
  const src = noise(n);
  return normalize(src.map((v, i) => {
    const gate = Math.floor(i / secs(0.03)) % 3 !== 1 ? 1 : 0;
    const crush = Math.round(v * 3) / 3;
    return crush * gate * Math.exp(-i / secs(0.2));
  }), 0.3);
})();

for (const [name, buf] of Object.entries(sfx)) writeWav(join(outDir, `${name}.wav`), buf);

// ── music bed ──────────────────────────────────────────────────────────────────────────────
// Three acts, following the story: a tense pre-dawn drone, a pulse once Aida appears,
// and a resolving chord under the end card. The composition ducks it under the voice.
const sceneAt = (id) => scenes.find((s) => s.id === id).from / FPS;
const tBrand = sceneAt("brand");
const tOutro = sceneAt("outro");
const tEnd = total / FPS;
const N = secs(tEnd);
const L = new Float32Array(N);
const R = new Float32Array(N);
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

function addPad(start, len, notes, gain, bright = 1600) {
  const s0 = secs(start), n = secs(len);
  const raw = new Float32Array(n);
  for (const note of notes) {
    for (const det of [-0.08, 0, 0.07]) {
      const f = hz(note + det);
      for (let h = 1; h <= 6; h++) {
        const a = 1 / h, w = (2 * Math.PI * f * h) / SR, p = h * 1.7 + det * 10;
        for (let i = 0; i < n; i++) raw[i] += a * Math.sin(w * i + p);
      }
    }
  }
  const { low } = svf(raw, () => bright, 0.6);
  for (let i = 0; i < n && s0 + i < N; i++) {
    const v = low[i] * gain * env(i, n, len * 0.35, len * 0.4) * 0.06;
    const pan = Math.sin((2 * Math.PI * i) / secs(6)) * 0.3;
    L[s0 + i] += v * (1 - pan);
    R[s0 + i] += v * (1 + pan);
  }
}

function addKick(t, gain) {
  const s0 = secs(t), n = secs(0.35);
  let ph = 0;
  for (let i = 0; i < n && s0 + i < N; i++) {
    ph += (2 * Math.PI * (45 + 90 * Math.exp(-i / secs(0.03)))) / SR;
    const v = Math.sin(ph) * Math.exp(-i / secs(0.11)) * gain;
    L[s0 + i] += v; R[s0 + i] += v;
  }
}

function addHat(t, gain) {
  const s0 = secs(t), n = secs(0.06);
  const { high } = svf(noise(n), () => 7000, 1);
  for (let i = 0; i < n && s0 + i < N; i++) {
    const v = high[i] * Math.exp(-i / secs(0.012)) * gain;
    L[s0 + i] += v * 0.7; R[s0 + i] += v;
  }
}

function addPluck(t, note, gain) {
  const s0 = secs(t), n = secs(0.5), f = hz(note);
  for (let i = 0; i < n && s0 + i < N; i++) {
    const e = Math.exp(-i / secs(0.12)) * Math.min(1, i / 30);
    const v = (Math.sin((2 * Math.PI * f * i) / SR) + 0.3 * Math.sin((4 * Math.PI * f * i) / SR)) * e * gain;
    L[s0 + i] += v * 1.1; R[s0 + i] += v * 0.9;
  }
}

// Act 1 — drone on D with a heartbeat that quickens toward the reveal.
addPad(0, tBrand + 0.6, [38, 45, 50], 1.1, 700);
addPad(tBrand * 0.45, tBrand * 0.55 + 0.4, [53, 57], 0.55, 1100);
for (let t = 0.4, gap = 1.2; t < tBrand - 0.3; t += gap, gap = Math.max(0.55, gap * 0.95)) addKick(t, 0.22);

// Act 2 — Dm · Bb · F · C at 100 bpm, kick on the beat, hats off the beat, arpeggio.
const beat = 0.6;
const chords = [[50, 53, 57], [46, 50, 53], [45, 48, 53], [48, 52, 55]];
const arps = [[62, 65, 69, 72], [58, 62, 65, 70], [57, 60, 65, 69], [60, 64, 67, 72]];
for (let t = tBrand, k = 0; t < tOutro; t += beat * 4, k++) {
  const c = k % 4;
  addPad(t, Math.min(beat * 4.6, tOutro - t + 0.5), chords[c], 0.9, 2200);
  for (let b = 0; b < 4 && t + b * beat < tOutro; b++) {
    addKick(t + b * beat, 0.34);
    addHat(t + b * beat + beat / 2, 0.08);
    addPluck(t + b * beat, arps[c][b], 0.05);
    addPluck(t + b * beat + beat / 2, arps[c][(b + 2) % 4], 0.035);
  }
}

// Act 3 — resolve to D major under the end card.
addPad(tOutro, tEnd - tOutro, [50, 54, 57, 62], 1, 2600);
addKick(tOutro, 0.4);

const fadeOut = secs(1.2);
for (let i = N - fadeOut; i < N; i++) {
  const g = (N - i) / fadeOut;
  L[i] *= g; R[i] *= g;
}
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
for (let i = 0; i < N; i++) { L[i] *= 0.8 / peak; R[i] *= 0.8 / peak; }
writeWav(join(outDir, "music.wav"), L, R);

rmSync(tmp, { recursive: true, force: true });
console.log(`wrote ${Object.keys(sfx).length} sfx, music bed and ${scenes.reduce((n, s) => n + s.lines.length, 0)} voice lines`);
