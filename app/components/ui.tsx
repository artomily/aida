"use client";

/**
 * Shared building blocks — the landing hero's components (public/index.html),
 * re-cut for a scrolling dashboard. Styling lives in globals.css under `.ds-*`.
 */
import Link from "next/link";
import { useId, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { NEG, POS, type Status, STATUS_LABEL } from "../lib/model";

/* ── icons ── */

export function BrandMark() {
  const clip = useId();
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <circle cx="20" cy="20" r="18.2" />
        </clipPath>
      </defs>
      <circle cx="20" cy="20" r="18.4" stroke="#0d1b30" strokeWidth="1.1" />
      <g
        clipPath={`url(#${clip})`}
        stroke="#0d1b30"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13.2 4.6c3-.9 6.2-1 9.2-.1" strokeWidth="1.7" />
        <path d="M5.6 9.2c3.8-1.9 8-2.4 11.7-1.2 2.5.8 4.3 2.1 6.6 2.3 2 .2 4.2-.4 6.4-1.5" strokeWidth="2.3" />
        <path d="M2.6 13.9c4.4-2.4 9.4-3 13.6-1.5 2.4.9 4.1 2.3 6.4 2.4 2.3.1 4.7-1 7.1-2.4 1.6-.9 3.4-1.4 5.3-1.4" strokeWidth="2.7" />
        <path d="M1.6 18.7c4.8-2.7 10.1-3.2 14.4-1.6 1.8.7 3.2 1.6 4.7 2.1-1.7 1.3-3.4 2.2-5.1 2.6 2.9.5 5.9-.1 8.8-1.5 1.5-.7 2.9-1.6 4.4-2.3 1.9-.9 3.9-1.3 5.9-1.1" strokeWidth="2.9" />
        <path d="M1.9 24.1c4.5-2.4 9.6-3 13.9-1.6 2.3.7 4 1.9 6.2 2 2.4.1 5-.9 7.5-2.3 1.6-.9 3.3-1.4 5-1.4" strokeWidth="2.8" />
        <path d="M3.7 28.8c4.1-2 8.7-2.5 12.6-1.3 2.2.7 3.8 1.8 5.9 1.8 2.3.1 4.8-.8 7.1-2.1 1.2-.7 2.5-1.1 3.8-1.2" strokeWidth="2.4" />
        <path d="M7.6 32.9c3.5-1.5 7.4-1.9 10.6-.9 1.9.6 3.3 1.4 5 1.5 1.6.1 3.3-.3 5-1.1" strokeWidth="1.9" />
        <path d="M13.6 35.8c2.8-.9 5.8-1 8.6-.2" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

const STROKE = { stroke: "#202940", strokeWidth: 1.7, fill: "none" } as const;

export const HomeIcon = () => (
  <svg viewBox="0 0 20 21" aria-hidden="true">
    <path d="M2 8.4 10 2l8 6.4V18a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" {...STROKE} strokeLinejoin="round" />
  </svg>
);

export const GridIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    {[
      [1, 1],
      [11.6, 1],
      [1, 11.6],
      [11.6, 11.6],
    ].map(([x, y]) => (
      <rect key={`${x}-${y}`} x={x} y={y} width="7.4" height="7.4" rx="1.7" {...STROKE} />
    ))}
  </svg>
);

export const BookIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M10 4.6C8.3 3.4 5.9 2.8 2 2.9v12.6c3.9-.1 6.3.5 8 1.7 1.7-1.2 4.1-1.8 8-1.7V2.9c-3.9-.1-6.3.5-8 1.7zM10 4.6v12.6" {...STROKE} strokeLinejoin="round" />
  </svg>
);

export const Chevron = () => (
  <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="m6.6 3.6 6 5.4-6 5.4" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ShieldIcon = () => (
  <svg viewBox="0 0 30 39" fill="none" aria-hidden="true">
    <path d="M15 1.2 1.6 6.6v13.1c0 6.6 5.1 12.6 13.4 17.9 8.3-5.3 13.4-11.3 13.4-17.9V6.6z" stroke="#101c33" strokeWidth="2" strokeLinejoin="round" />
    <path d="M2.1 18.9c4.6-1.1 8.9-1.6 12.9-1.6s8.3.5 12.9 1.6" stroke="#101c33" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** A target — "how far from the aim". */
export const TargetIcon = () => (
  <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <circle cx="14" cy="14" r="12" stroke="#101c33" strokeWidth="2" />
    <circle cx="14" cy="14" r="6.5" stroke="#101c33" strokeWidth="2" />
    <circle cx="14" cy="14" r="1.8" fill="#101c33" />
  </svg>
);

/** "i" — stands in for the hero's play button next to the explanatory tagline. */
export const InfoIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="8.6" stroke="#0b1526" strokeWidth="1.7" />
    <path d="M10 9v5" stroke="#0b1526" strokeWidth="1.9" strokeLinecap="round" />
    <circle cx="10" cy="6" r="1.2" fill="#0b1526" />
  </svg>
);

/** Two arrows passing — the SGX × IDX comparison. */
export const SwapIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M3 6.5h13M12.5 3l3.5 3.5-3.5 3.5M17 13.5H4M7.5 10 4 13.5 7.5 17" {...STROKE} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const QuestionIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <circle cx="10" cy="10" r="8.6" {...STROKE} />
    <path d="M7.6 7.7a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6" {...STROKE} strokeLinecap="round" />
    <circle cx="10" cy="14.6" r="1" fill="#202940" />
  </svg>
);

/* ── surfaces ── */

export function Glass({
  children,
  className = "",
  style,
  delay,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Entrance stagger in ms. */
  delay?: number;
  as?: "section" | "aside" | "div";
}) {
  return (
    <Tag
      className={`ds-glass ds-enter ${className}`}
      style={{ ...style, ...(delay ? ({ "--d": `${delay}ms` } as CSSProperties) : null) }}
    >
      {children}
    </Tag>
  );
}

export function SectionHead({ title, note, right }: { title: ReactNode; note?: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <h2 className="ds-h2">{title}</h2>
        {note ? <p className="ds-note">{note}</p> : <div style={{ height: 16 }} />}
      </div>
      {right}
    </div>
  );
}

/* ── actions ── */

type ActionProps = {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "dark" | "glass" | "back";
  className?: string;
  /** Run `onClick` but still follow `href`. */
  passthrough?: boolean;
};

/** Internal routes go through next/link; anchors and externals stay plain <a>. */
function Anchor({
  href,
  className,
  style,
  onClick,
  passthrough,
  children,
}: {
  href: string;
  className: string;
  style?: CSSProperties;
  onClick?: () => void;
  passthrough?: boolean;
  children: ReactNode;
}) {
  const handle = (e: MouseEvent) => {
    if (!onClick) return;
    if (!passthrough) e.preventDefault();
    onClick();
  };
  return href.startsWith("/") ? (
    <Link className={className} style={style} href={href} onClick={handle}>
      {children}
    </Link>
  ) : (
    <a className={className} style={style} href={href} onClick={handle}>
      {children}
    </a>
  );
}

/** The hero's dark "Get free plan" pill — label plus round chevron knob. */
export function Cta({ children, onClick, href = "#", variant = "dark", className = "", passthrough }: ActionProps) {
  const cls = `ds-cta ${variant === "glass" ? "ds-cta--glass" : ""} ${
    variant === "back" ? "ds-cta--glass ds-cta--back" : ""
  } ${className}`;
  const knob = (
    <i className="ds-knob">
      <Chevron />
    </i>
  );
  return (
    <Anchor className={cls} href={href} onClick={onClick} passthrough={passthrough}>
      {variant === "back" ? (
        <>
          {knob}
          {children}
        </>
      ) : (
        <>
          <span>{children}</span>
          {knob}
        </>
      )}
    </Anchor>
  );
}

/** The hero's "Meet Sentinel" pill — sphere thumbnail, label, knob. */
export function GuidePill({
  children,
  onClick,
  href = "#",
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  return (
    <Anchor
      className="ds-cta ds-cta--glass ds-guide ds-enter"
      href={href}
      style={{ "--d": "450ms" } as CSSProperties}
      onClick={onClick}
    >
      <span className="ds-thumb" aria-hidden="true" />
      <span>{children}</span>
      <i className="ds-knob">
        <Chevron />
      </i>
    </Anchor>
  );
}

/* ── type ── */

export function Hero({
  eyebrow,
  title,
  tag,
  aside,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  tag?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="ds-hero">
      <div className="ds-enter">
        <p className="ds-eyebrow">{eyebrow}</p>
        <h1 className="ds-h1">{title}</h1>
        {tag && (
          <div className="ds-tagrow">
            <span className="ds-play">
              <InfoIcon />
            </span>
            <p className="ds-tag">{tag}</p>
          </div>
        )}
      </div>
      {aside}
    </div>
  );
}

/**
 * The hero's glass panel: title + accent dot, round icon badge, sub copy,
 * and a labelled meter. `fill` is 0–1.
 */
export function MeterPanel({
  title,
  icon,
  sub,
  big,
  scale,
  fill,
  dot,
  label,
}: {
  title: ReactNode;
  icon: ReactNode;
  sub: ReactNode;
  big?: ReactNode;
  scale: string[];
  fill: number;
  dot?: string;
  /** Accessible name for the meter. */
  label?: string;
}) {
  return (
    <Glass as="aside" className="ds-panel" delay={200}>
      <div>
        <div className="ds-panel-title">
          {title}
          <i className="ds-dot" style={dot ? { background: dot } : undefined} />
        </div>
        {big && <div className="ds-panel-big tnum">{big}</div>}
      </div>
      <span className="ds-badge-icon">{icon}</span>
      <p className="ds-panel-sub" style={{ gridColumn: "1 / -1" }}>
        {sub}
      </p>
      <Meter scale={scale} fill={fill} label={label} />
    </Glass>
  );
}

export function Meter({ scale, fill, label }: { scale: string[]; fill: number; label?: string }) {
  const pct = Math.max(0, Math.min(1, fill)) * 100;
  return (
    <div className="ds-meter" style={scale.length ? undefined : { marginTop: 0 }}>
      {scale.length > 0 && (
        <div className="ds-scale tnum" aria-hidden="true">
          {scale.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      )}
      <div
        className="ds-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={label}
      >
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── figures ── */

export type StatItem = { value: ReactNode; label: ReactNode; color?: string };

/** Big light numerals separated by the hero's hairline slash. */
export function StatRow({ items, small }: { items: StatItem[]; small?: boolean }) {
  return (
    <div className={`ds-stats ds-enter ${small ? "ds-stats--sm" : ""}`} style={{ "--d": "300ms" } as CSSProperties}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "contents" }}>
          {i > 0 && <span className="ds-slash" aria-hidden="true" />}
          <div className="ds-stat">
            <span className={`ds-num ${small ? "ds-num--sm" : ""}`} style={it.color ? { color: it.color } : undefined}>
              {it.value}
            </span>
            <span className="ds-lbl">{it.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatusBadge({ status, pos }: { status: Status; pos: boolean }) {
  const color = status === "NORMAL" ? undefined : status === "WATCH" ? "#8a96ab" : pos ? POS : NEG;
  return (
    <span className="ds-status" style={status === "DIVERGENT" ? { color } : undefined}>
      <i style={color ? { background: color } : undefined} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Direction arrow so polarity never relies on colour alone. */
export const Arrow = ({ v }: { v: number }) => (
  <span aria-hidden="true" style={{ fontSize: "0.72em", marginRight: 4 }}>
    {v > 0 ? "▲" : v < 0 ? "▼" : "•"}
  </span>
);

/** Two-sided bar centred on zero. `ratio` is −1…1. */
export function SplitBar({ ratio, faded }: { ratio: number; faded?: boolean }) {
  const half = Math.min(Math.abs(ratio), 1) * 50;
  const pos = ratio >= 0;
  return (
    <div className="ds-bar" aria-hidden="true">
      <i
        style={{
          left: pos ? "50%" : `${50 - half}%`,
          width: `${half}%`,
          background: pos ? POS : NEG,
          opacity: faded ? 0.45 : 1,
        }}
      />
    </div>
  );
}
