# Launch checklist

## Before closed beta

- [ ] `pnpm eval:chat` with the real key: ≥ 27/30 on the chosen chat model (compare Haiku 5.5 vs Sonnet 5.5).
- [ ] One real generation batch: `AI_DAILY_PACKS=10`, run `/api/cron/content-plan?force` then `batch-poll`;
      review every item in `/admin/moderation`; record cost per published question from `/admin/usage`.
- [ ] Human rejection rate < 20% after prompt iteration; keep `AI_AUTO_APPROVE=false` for two weeks.
- [ ] Bilingual reviewer pass on `/admin/senses` (dataset-imported Vietnamese meanings stay unpublished until approved).
- [ ] Confirm licenses still open: NGSL/BSL/TSL (email the authors), CMUdict LICENSE, Kaikki terms.
- [ ] Privacy policy and terms reviewed by counsel (PDPD, Decree 13/2023 + 2025 law); replace the placeholder contact email.
- [ ] Load test on staging: `k6 run tests/load/k6.js` — p95 answer < 250 ms, error rate < 0.5%.
- [ ] Real-device check: 60 fps desktop, ≥ 30 fps mid-range Android (e.g. Galaxy A54); touch controls.
- [ ] Lighthouse on the home page (`/`) ≥ 90 (performance, SEO, accessibility).

## Launch day

- [ ] Supabase PITR backups on; keys rotated from any used in testing.
- [ ] Rate limits verified in production (answer 30/min, chat 6/min, quotas).
- [ ] `AI_DAILY_BUDGET_USD` set; cost alert watched for the first week.
- [ ] Sentry and PostHog keys set; funnel: home → first lesson → first answer → day-2 return.
- [ ] No open P0 bugs for one week of beta.

## Known limitations (tracked)

- Speech is pre-generated with `pnpm tts` (macOS `say` voices) and served from `/audio`; dictation then sends only an
  opaque audio URL. Apple's system voices are licensed for personal use: before a public launch, regenerate the audio
  with a commercially licensed TTS provider (the script's provider hook) and host the files. Without the files the
  game falls back to Web Speech, and dictation falls back to sending the text (low-stakes practice).
- Characters are our own pixel art (one template + palette + hair styles/accessories per NPC) on Kenney CC0 tiles.
  A commissioned art pass is still recommended for a distinctive brand.
