/** Apply `db/migrations` to DATABASE_URL (Neon). Run with `npm run db:migrate`. */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set — the pipeline falls back to JSON files under .data/, nothing to migrate.");
    process.exitCode = 1;
    return;
  }
  await migrate(drizzle(neon(url)), { migrationsFolder: "db/migrations" });
  console.log("migrations applied");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
