/**
 * Global control series for the Sensitivity regression: S&P 500 futures, USD/IDR, Hang Seng.
 *
 * sectors.app carries none of these at daily frequency (its commodity prices are monthly), so
 * they are read from local CSV files you supply: `data/controls/<series>.csv` with a
 * `date,value` header and one level per trading day. Missing files are fine — the regression
 * runs without that control and the methodology page says so.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ControlRow, ControlSeries } from "../scoring/types";

const SERIES: ControlSeries[] = ["spx_fut", "usdidr", "hsi", "coal", "cpo"];

export function loadControls(dir = path.join(process.cwd(), "data", "controls")): ControlRow[] {
  const out: ControlRow[] = [];
  for (const series of SERIES) {
    const file = path.join(dir, `${series}.csv`);
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, "utf8").trim().split(/\r?\n/).slice(1);
    for (const line of lines) {
      const [date, value] = line.split(",");
      const v = Number(value);
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && v > 0) out.push({ date, series, value: v });
    }
  }
  return out;
}
