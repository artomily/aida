"use client";

import { useRef, useState } from "react";
import {
  NEG,
  POS,
  SECTORS,
  dispersionSeries,
  fmt,
  fmtZ,
  statusMix,
  statusOf,
  type Status,
} from "../lib/model";

const SURFACE = "#0c0b0a";
const GRID = "#1e1b18";
const RULE = "1px solid #24211d";
const MUTED = "#8a847c";
const DIM = "#6f6960";
const NORMAL_INK = "#6f6960";

const panelTitle = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.16em",
  color: "#e8e5e0",
} as const;

const panelNote = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "#7d776f",
  marginTop: 4,
  marginBottom: 14,
} as const;

const axisLabel = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  fill: MUTED,
} as const;

type Tip = { x: number; y: number; title: string; lines: string[] } | null;

/** Column with its data-end rounded and its baseline end square. */
function columnPath(x: number, w: number, base: number, value: number, r = 4) {
  const up = value >= 0;
  const h = Math.abs(value);
  const radius = Math.min(r, w / 2, h);
  const top = up ? base - h : base;
  const bottom = up ? base : base + h;
  if (up) {
    return `M${x} ${bottom} L${x} ${top + radius} Q${x} ${top} ${x + radius} ${top} L${
      x + w - radius
    } ${top} Q${x + w} ${top} ${x + w} ${top + radius} L${x + w} ${bottom} Z`;
  }
  return `M${x} ${top} L${x} ${bottom - radius} Q${x} ${bottom} ${x + radius} ${bottom} L${
    x + w - radius
  } ${bottom} Q${x + w} ${bottom} ${x + w} ${bottom - radius} L${x + w} ${top} Z`;
}

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: tip.x,
        top: tip.y,
        transform: "translate(-50%, -100%)",
        pointerEvents: "none",
        background: "#151310",
        border: "1px solid #322d28",
        padding: "7px 9px",
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        lineHeight: 1.6,
        color: "#ded9d1",
        whiteSpace: "nowrap",
        zIndex: 4,
      }}
    >
      <div style={{ color: "#e8e5e0", letterSpacing: "0.08em" }}>{tip.title}</div>
      {tip.lines.map((l) => (
        <div key={l} style={{ color: MUTED }}>
          {l}
        </div>
      ))}
    </div>
  );
}

/** Residual per sector today — polarity against the model's expectation. */
function ResidualColumns() {
  const [tip, setTip] = useState<Tip>(null);
  const box = useRef<HTMLDivElement>(null);

  const data = SECTORS.map((s) => ({
    ...s,
    r: +(s.a - s.e).toFixed(2),
    status: statusOf(s.z),
  })).sort((a, b) => b.r - a.r);

  const W = 520;
  const H = 168;
  const BASE = 96;
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.r)), 0.5);
  const scale = 72 / maxAbs;
  const slot = W / data.length;
  const barW = Math.min(24, slot - 10);

  const extremes = new Set([data[0].slug, data[data.length - 1].slug]);

  return (
    <div ref={box} style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 168, display: "block" }}>
        <line x1="0" y1={BASE - 72} x2={W} y2={BASE - 72} stroke={GRID} strokeWidth="1" />
        <line x1="0" y1={BASE} x2={W} y2={BASE} stroke="#34302b" strokeWidth="1" />
        <line x1="0" y1={BASE + 72} x2={W} y2={BASE + 72} stroke={GRID} strokeWidth="1" />
        <text x="2" y={BASE - 76} style={axisLabel}>
          +{maxAbs.toFixed(1)}%
        </text>
        <text x="2" y={BASE + 84} style={axisLabel}>
          −{maxAbs.toFixed(1)}%
        </text>

        {data.map((d, i) => {
          const x = i * slot + (slot - barW) / 2;
          const pos = d.r >= 0;
          const color = d.status === "NORMAL" ? NORMAL_INK : pos ? POS : NEG;
          const label = d.code.replace(/^IDX/, "");
          return (
            <g key={d.slug}>
              <path
                d={columnPath(x, barW, BASE, d.r * scale)}
                fill={color}
                opacity={d.status === "NORMAL" ? 0.55 : 1}
              />
              {extremes.has(d.slug) && (
                <text
                  x={x + barW / 2}
                  y={pos ? BASE - Math.abs(d.r) * scale - 7 : BASE + Math.abs(d.r) * scale + 14}
                  textAnchor="middle"
                  style={{ ...axisLabel, fill: "#ded9d1" }}
                >
                  {fmt(d.r)}
                </text>
              )}
              <text
                x={x + barW / 2}
                y={H - 4}
                textAnchor="middle"
                style={{ ...axisLabel, fill: DIM }}
              >
                {label}
              </text>
              <rect
                x={i * slot}
                y="0"
                width={slot}
                height={H}
                fill="transparent"
                onMouseEnter={(e) => {
                  const b = box.current?.getBoundingClientRect();
                  const t = (e.target as SVGRectElement).getBoundingClientRect();
                  const bar = (e.currentTarget.parentElement as SVGGElement | null)
                    ?.querySelector("path")
                    ?.getBoundingClientRect();
                  if (!b) return;
                  setTip({
                    // Clamped so the tooltip never runs off either edge of the panel.
                    x: Math.min(Math.max(t.left - b.left + t.width / 2, 78), b.width - 78),
                    y: (bar ? bar.top - b.top : 0) - 8,
                    title: d.name.toUpperCase(),
                    lines: [
                      `RESIDUAL ${fmt(d.r)}`,
                      `Z-SCORE  ${fmtZ(d.z)}`,
                      `STATUS   ${d.status}`,
                    ],
                  });
                }}
                onMouseLeave={() => setTip(null)}
              />
            </g>
          );
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

/** Mean |z| over the last 30 sessions — is the board unusually wide today? */
function DispersionLine() {
  const [tip, setTip] = useState<Tip>(null);
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const pts = dispersionSeries();
  const W = 300;
  const H = 150;
  const TOP = 12;
  const BOTTOM = 124;
  const maxV = Math.max(...pts) + 0.15;
  const X = (i: number) => (i / (pts.length - 1)) * W;
  const Y = (v: number) => BOTTOM - (v / maxV) * (BOTTOM - TOP);

  const line = pts.map((p, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p).toFixed(1)).join(" ");
  const area = `${line} L${W} ${BOTTOM} L0 ${BOTTOM} Z`;
  const today = pts[pts.length - 1];
  const mean = pts.reduce((a, b) => a + b, 0) / pts.length;

  return (
    <div ref={box} style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: 150, display: "block" }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const b = box.current?.getBoundingClientRect();
          if (!b) return;
          const ratio = (e.clientX - rect.left) / rect.width;
          const i = Math.max(0, Math.min(pts.length - 1, Math.round(ratio * (pts.length - 1))));
          setHover(i);
          setTip({
            x: rect.left - b.left + (i / (pts.length - 1)) * rect.width,
            y: rect.top - b.top + 6,
            title: i === pts.length - 1 ? "HARI INI" : `T−${pts.length - 1 - i}`,
            lines: [`MEAN |z|  ${pts[i].toFixed(2)}`],
          });
        }}
        onMouseLeave={() => {
          setHover(null);
          setTip(null);
        }}
      >
        <line x1="0" y1={Y(1.0)} x2={W} y2={Y(1.0)} stroke={GRID} strokeWidth="1" />
        <line x1="0" y1={Y(0.5)} x2={W} y2={Y(0.5)} stroke={GRID} strokeWidth="1" />
        <line x1="0" y1={BOTTOM} x2={W} y2={BOTTOM} stroke="#2a2622" strokeWidth="1" />
        <path d={area} fill="rgba(209,154,63,0.10)" stroke="none" />
        <path
          d={line}
          fill="none"
          stroke={POS}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {hover !== null && (
          <line
            x1={X(hover)}
            y1={TOP}
            x2={X(hover)}
            y2={BOTTOM}
            stroke="#4a443c"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <circle
          cx={X(pts.length - 1)}
          cy={Y(today)}
          r="4"
          fill={POS}
          stroke={SURFACE}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: DIM,
          marginTop: 8,
        }}
      >
        <span>T−29</span>
        <span>MEAN 30D {mean.toFixed(2)}</span>
        <span style={{ color: POS }}>HARI INI {today.toFixed(2)}</span>
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}

/**
 * Status mix as one stacked bar rather than a pie — three parts of a whole are read
 * far more accurately from a common baseline than from angles.
 */
function StatusMix() {
  const [tip, setTip] = useState<Tip>(null);
  const box = useRef<HTMLDivElement>(null);

  const counts = statusMix();
  const total = SECTORS.length;
  const order: { key: Status; color: string; note: string }[] = [
    { key: "DIVERGENT", color: POS, note: "|z| ≥ 2,0" },
    { key: "WATCH", color: "#9a938a", note: "|z| 1,0 – 2,0" },
    { key: "NORMAL", color: NORMAL_INK, note: "|z| < 1,0" },
  ];

  return (
    <div ref={box} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 2, height: 26 }}>
        {order.map((o) => {
          const n = counts[o.key];
          if (!n) return null;
          return (
            <div
              key={o.key}
              style={{
                flex: n,
                background: o.color,
                opacity: o.key === "NORMAL" ? 0.55 : 1,
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                const b = box.current?.getBoundingClientRect();
                const t = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                if (!b) return;
                setTip({
                  x: t.left - b.left + t.width / 2,
                  y: t.top - b.top,
                  title: o.key,
                  lines: [`${n} dari ${total} sektor`, `${((n / total) * 100).toFixed(0)}% · ${o.note}`],
                });
              }}
              onMouseLeave={() => setTip(null)}
            />
          );
        })}
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {order.map((o) => (
          <div
            key={o.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              borderBottom: "1px solid #1a1815",
              paddingBottom: 8,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                background: o.color,
                opacity: o.key === "NORMAL" ? 0.55 : 1,
                display: "inline-block",
              }}
            />
            <span style={{ color: "#ded9d1", letterSpacing: "0.1em" }}>{o.key}</span>
            <span style={{ color: DIM, fontSize: 10 }}>{o.note}</span>
            <span style={{ flex: 1 }} />
            <span style={{ color: "#ded9d1" }}>{counts[o.key]}</span>
            <span style={{ color: MUTED, fontSize: 10 }}>
              {((counts[o.key] / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}

export default function BoardCharts() {
  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.9fr) minmax(0, 1.1fr) minmax(0, 1fr)",
        borderBottom: RULE,
      }}
    >
      <div style={{ padding: "22px 28px 22px 0", borderRight: RULE }}>
        <h2 style={panelTitle}>RESIDUAL BY SECTOR</h2>
        <div style={panelNote}>
          ACTUAL − EXPECTED, pp · <span style={{ color: POS }}>■</span> DI ATAS EKSPEKTASI ·{" "}
          <span style={{ color: NEG }}>■</span> DI BAWAH · <span style={{ color: DIM }}>■</span>{" "}
          DALAM AMBANG NORMAL
        </div>
        <ResidualColumns />
      </div>

      <div style={{ padding: "22px 28px", borderRight: RULE }}>
        <h2 style={panelTitle}>DISPERSION · 30 SESI</h2>
        <div style={panelNote}>RATA-RATA |z| SELURUH SEKTOR PER SESI</div>
        <DispersionLine />
      </div>

      <div style={{ padding: "22px 0 22px 28px" }}>
        <h2 style={panelTitle}>STATUS MIX</h2>
        <div style={panelNote}>11 SEKTOR IDX PAGI INI</div>
        <StatusMix />
      </div>
    </section>
  );
}
