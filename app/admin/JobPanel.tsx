"use client";

import { useActionState, useState } from "react";
import { runJob, type JobName, type JobState } from "./actions";

const JOBS: { job: JobName; label: string; note: string; confirm?: string }[] = [
  { job: "pipeline", label: "Jalankan pipeline harian", note: "SGX → berita & filing → skor → snapshot. Sama dengan cron pagi." },
  { job: "plan", label: "Rencana backfill", note: "Hitung perkiraan kredit. Tidak memanggil API." },
  {
    job: "backfill",
    label: "Jalankan backfill",
    note: "Riwayat harga 3 tahun, dicicil per ±4 menit. Klik lagi sampai selesai.",
    confirm: "Backfill memakai kredit sectors.app (lihat Rencana backfill). Lanjutkan?",
  },
  { job: "weekly", label: "Estimasi ulang beta", note: "Refresh universe + regresi 11 sektor. Biasanya otomatis tiap Senin." },
  { job: "sgx", label: "Hanya SGX", note: "Harga penutupan SGX + STI." },
  { job: "news", label: "Hanya berita & filing", note: "Berita SGX terkait + filing kepemilikan IDX." },
  { job: "score", label: "Hanya skor", note: "Hitung ulang snapshot dari data tersimpan." },
];

export default function JobPanel() {
  const [state, action, pending] = useActionState<JobState, FormData>(runJob, {});
  const [active, setActive] = useState<JobName | null>(null);

  return (
    <div>
      <div className="dv-jobs">
        {JOBS.map((j) => (
          <form
            key={j.job}
            action={action}
            onSubmit={(e) => {
              if (j.confirm && !window.confirm(j.confirm)) e.preventDefault();
              else setActive(j.job);
            }}
          >
            <input type="hidden" name="job" value={j.job} />
            <button type="submit" className={`dv-job ${j.job === "pipeline" ? "dv-job--primary" : ""}`} disabled={pending}>
              <b>{pending && active === j.job ? "Berjalan…" : j.label}</b>
              <small>{j.note}</small>
            </button>
          </form>
        ))}
      </div>
      {state.message !== undefined && (
        <p role="status" className={`dv-result dv-result--${state.status}`}>
          <strong>{state.job}</strong> · {state.status} · {state.message}
          {state.calls !== undefined && ` · ${state.calls} panggilan upstream`}
        </p>
      )}
    </div>
  );
}
