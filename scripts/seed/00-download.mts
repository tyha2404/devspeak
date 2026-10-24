/**
 * Downloads every dataset into content/raw/ (gitignored) and records sha256 in data/sources.lock.json.
 * Archives are treated as untrusted data: written to their own directory and only parsed as text.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { RAW, ROOT, SOURCES, sha256 } from "./lib.mts";

const lockFile = path.join(ROOT, "data/sources.lock.json");
const lock: Record<string, { url: string; sha256: string; retrievedAt: string }> = fs.existsSync(
  lockFile,
)
  ? JSON.parse(fs.readFileSync(lockFile, "utf8"))
  : {};

for (const s of SOURCES) {
  for (const f of s.files) {
    const dest = path.join(RAW, f.file);
    if (fs.existsSync(dest)) {
      console.log(`✓ ${f.file} (cached)`);
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const res = await fetch(f.url, {
      headers: { "User-Agent": "DevQuestEnglish/1.0 (dataset import)" },
    });
    if (!res.ok) throw new Error(`${f.url}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (f.bunzip) {
      const archive = `${dest}.bz2`;
      fs.writeFileSync(archive, buf);
      const r = spawnSync("bunzip2", ["-f", archive], { stdio: "inherit" });
      if (r.status !== 0) throw new Error(`bunzip2 failed for ${archive}`);
    } else fs.writeFileSync(dest, buf);
    lock[f.file] = {
      url: f.url,
      sha256: sha256(dest),
      retrievedAt: new Date().toISOString().slice(0, 10),
    };
    console.log(`↓ ${f.file} (${(fs.statSync(dest).size / 1e6).toFixed(1)} MB)`);
  }
}
fs.writeFileSync(lockFile, JSON.stringify(lock, null, 2) + "\n");
