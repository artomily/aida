"use client";

import { useRef, useState } from "react";
import { Glass, SectionHead } from "./ui";
import {
  NEG,
  NEUTRAL,
  POS,
  SECTORS,
  dispersionSeries,
  fmt,
  fmtZ,
  statusMix,
  statusOf,
  STATUS_LABEL,
  type Status,
} from "../lib/model";

const SURFACE = "#ffffff";
const GRID = "rgba(120,145,180,0.18)";
const BASELINE = "#a7b4c6";
const MUTED = "#59627e";
const DIM = "#7c869d";
const NORMAL_INK = NEUTRAL;

const axisLabel = {
  fontSize: 10.5,
  fill: MUTED,
  fontVariantNumeric: "tabular-nums",
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

export function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div className="ds-tip" style={{ left: tip.x, top: tip.y }}>
      <b>{tip.title}</b>
      {tip.lines.map((l) => (
        <div key={l}>{l}</div>
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
        <line x1="0" y1={BASE} x2={W} y2={BASE} stroke={BASELINE} strokeWidth="1" />
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
                opacity={d.status === "NORMAL" ? 0.7 : 1}
              />
              {extremes.has(d.slug) && (
                <text
                  x={x + barW / 2}
                  y={pos ? BASE - Math.abs(d.r) * scale - 7 : BASE + Math.abs(d.r) * scale + 14}
                  textAnchor="middle"
                  style={{ ...axisLabel, fill: "#020c21", fontWeight: 560 }}
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
                    title: d.name,
                    lines: [
                      `Selisih dari perkiraan: ${fmt(d.r)}`,
                      `Skor tidak biasa: ${fmtZ(d.z)}`,
                      STATUS_LABEL[d.status],
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
            title: i === pts.length - 1 ? "Hari ini" : `${pts.length - 1 - i} hari lalu`,
            lines: [`Rata-rata skor: ${pts[i].toFixed(2)}`],
          });
        }}
        onMouseLeave={() => {
          setHover(null);
          setTip(null);
        }}
      >
        <line x1="0" y1={Y(1.0)} x2={W} y2={Y(1.0)} stroke={GRID} strokeWidth="1" />
        <line x1="0" y1={Y(0.5)} x2={W} y2={Y(0.5)} stroke={GRID} strokeWidth="1" />
        <line x1="0" y1={BOTTOM} x2={W} y2={BOTTOM} stroke={BASELINE} strokeWidth="1" />
        <path d={area} fill="rgba(58,106,168,0.12)" stroke="none" />
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
            stroke={BASELINE}
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
        className="tnum"
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12.5,
          color: DIM,
          marginTop: 10,
        }}
      >
        <span>30 hari lalu</span>
        <span>Rata-rata {mean.toFixed(2)}</span>
        <span style={{ color: POS, fontWeight: 560 }}>Hari ini {today.toFixed(2)}</span>
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
    { key: "DIVERGENT", color: "#0f1b31", note: "skor ≥ 2,0" },
    { key: "WATCH", color: "#5f88b4", note: "skor 1,0 – 2,0" },
    { key: "NORMAL", color: "#dde4ee", note: "skor < 1,0" },
  ];

  return (
    <div ref={box} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 4, height: 30 }}>
        {order.map((o) => {
          const n = counts[o.key];
          if (!n) return null;
          return (
            <div
              key={o.key}
              style={{
                flex: n,
                background: o.color,
                borderRadius: 999,
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                const b = box.current?.getBoundingClientRect();
                const t = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                if (!b) return;
                setTip({
                  x: t.left - b.left + t.width / 2,
                  y: t.top - b.top,
                  title: STATUS_LABEL[o.key],
                  lines: [`${n} dari ${total} sektor`, `${((n / total) * 100).toFixed(0)}% · ${o.note}`],
                });
              }}
              onMouseLeave={() => setTip(null)}
            />
          );
        })}
      </div>

      <div style={{ display: "grid", marginTop: 14 }}>
        {order.map((o) => (
          <div
            key={o.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 14,
              borderBottom: "1px solid rgba(120,145,180,0.18)",
              padding: "10px 0",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: o.color,
                boxShadow: "inset 0 0 0 1px rgba(120,145,180,0.3)",
                display: "inline-block",
                flex: "none",
              }}
            />
            <span style={{ display: "grid", gap: 2 }}>
              <span style={{ color: "var(--ink)", fontWeight: 500 }}>{STATUS_LABEL[o.key]}</span>
              <span style={{ color: DIM, fontSize: 12.5 }}>{o.note}</span>
            </span>
            <span style={{ flex: 1 }} />
            <span className="tnum" style={{ color: "var(--ink)", fontWeight: 560 }}>{counts[o.key]}</span>
            <span className="tnum" style={{ color: MUTED, fontSize: 12.5, width: 34, textAlign: "right" }}>
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
    <div className="ds-grid ds-charts">
      <Glass delay={480}>
        <SectionHead
          title="Selisih tiap sektor hari ini"
          note={
            <>
              Batang ke atas <span style={{ color: POS }}>▲</span> = lebih kuat dari perkiraan, ke bawah{" "}
              <span style={{ color: NEG }}>▼</span> = lebih lemah. Abu-abu = masih wajar.
            </>
          }
        />
        <ResidualColumns />
      </Glass>

      <Glass delay={520}>
        <SectionHead
          title="Seberapa ramai hari ini?"
          note="Rata-rata skor 'tidak biasa' semua sektor, 30 hari terakhir. Makin tinggi, makin banyak kejutan."
        />
        <DispersionLine />
      </Glass>

      <Glass delay={560}>
        <SectionHead title="Ringkasan status" note="Pembagian 11 sektor IDX pagi ini." />
        <StatusMix />
      </Glass>
    </div>
  );
}
