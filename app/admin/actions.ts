"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { defaultBackfill, planBackfill, runBackfill } from "../../jobs/backfill";
import { context } from "../../jobs/context";
import { runDaily } from "../../jobs/daily";
import { recorded } from "../../jobs/runlog";
import { runWeeklyBeta } from "../../jobs/weekly-beta";
import { requireAdmin, startAdminSession } from "../lib/admin";
import { ADMIN_COOKIE, passwordMatches } from "../lib/admin-token";

export type LoginState = { error?: string };

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  if (!process.env.ADMIN_PASSWORD) return { error: "ADMIN_PASSWORD belum diatur di environment." };
  if (!passwordMatches(String(form.get("password") ?? ""))) {
    // Slow down guessing without keeping any state.
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Kata sandi salah." };
  }
  await startAdminSession();
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

export type JobName = "plan" | "backfill" | "pipeline" | "sgx" | "news" | "score" | "weekly";
export type JobState = { job?: JobName; status?: "ok" | "partial" | "error"; message?: string; calls?: number };

/** Leave a minute of the 300 s request budget for logging and rendering. */
const SLICE_MS = 240_000;

export async function runJob(_: JobState, form: FormData): Promise<JobState> {
  await requireAdmin();
  const job = String(form.get("job")) as JobName;
  const force = form.get("force") === "on";
  const ctx = await context();
  const deadline = Date.now() + SLICE_MS;

  if (job === "plan") {
    const p = planBackfill(ctx, defaultBackfill());
    return {
      job,
      status: "ok",
      message: `${p.from} → ${p.to}: ${p.idxSymbols} emiten IDX + ${p.sgxSymbols} simbol SGX, maksimal ${p.total} kredit (harga yang sudah tersimpan tidak diambil ulang).`,
      calls: 0,
    };
  }

  const run = await recorded(ctx, job, "admin", async () => {
    switch (job) {
      case "backfill": {
        const opts = defaultBackfill();
        // A backfill is a deliberate, budgeted exception to the hourly cap.
        process.env.SECTORS_MAX_CALLS_PER_HOUR = String(Math.max(planBackfill(ctx, opts).total + 50, Number(process.env.SECTORS_MAX_CALLS_PER_HOUR ?? 0)));
        return runBackfill(ctx, opts, deadline);
      }
      case "weekly": {
        const r = await runWeeklyBeta(ctx);
        return { status: "ok", message: `${[...r.values()].filter((x) => x.significant).length}/11 sektor signifikan setelah koreksi.` };
      }
      case "pipeline":
      case "sgx":
      case "news":
      case "score":
        return { status: "ok", message: await runDaily(ctx, job, undefined, deadline) };
      default:
        throw new Error(`Job tidak dikenal: ${job}`);
    }
  }, { force });
  refresh();
  return { job, status: run.status === "running" ? "error" : run.status, message: run.message ?? "", calls: run.upstreamCalls };
}
