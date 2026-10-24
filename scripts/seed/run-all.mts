/** Download + import every open dataset, then the curated content. */
import { spawnSync } from "node:child_process";

const steps = [
  "scripts/seed/00-download.mts",
  "scripts/seed/10-vocab.mts",
  "scripts/seed/20-tatoeba.mts",
  "scripts/seed-curated.mts",
];
for (const s of steps) {
  console.log(`\n▶ ${s}`);
  const r = spawnSync(process.execPath, ["--env-file-if-exists=.env.local", "--import", "tsx", s], {
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
