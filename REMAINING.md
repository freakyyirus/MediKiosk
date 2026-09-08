# MediKiosk — What Remains & What To Do

> Current state as of the last session: **all 9 remaining items are DONE.**
> Every backend verification passes (62 tests, ruff clean), the frontend builds and
> typechecks clean, and the Playwright e2e smoke suite passes (6 tests) offline.

---

## Completed (this round)

| # | Item | Status |
|---|------|--------|
| 1 | True 13-language UI localization | ✅ `lib/kioskI18n.ts` (13 langs) + `AnatomyMap` labels (13 langs) |
| 2 | Emergency red-flag routing | ✅ dedicated Emergency screen (ambulance 108/112 + nearest-ER, no OPD booking) |
| 3 | High Contrast vs Low-Literacy conflict | ✅ all kiosk surfaces on `highContrast`; Easy Read removed |
| 4 | Missing backend `/api/v1/voice/translate` | ✅ endpoint + 4 tests; NMT passthrough-safe |
| 5 | e2e / smoke tests | ✅ Playwright suite wired into CI (6 tests pass); smoke covers kiosk journey |
| 6 | Live API keys + env wiring | ✅ Google keys in git-ignored envs; backend degrades gracefully if billing off |
| 7 | Seed/deployment consistency | ✅ legacy SQL/all backups moved to Bangalore (no Delhi refs remain) |
| 8 | CI only covers backend | ✅ added frontend job (tsc + build + Playwright) in `.github/workflows/test.yml` |
| 9 | Spec-vs-code audit | ✅ `spec/kiosk.md` written as single source of truth + parity map |

### Details
- **§1** `frontend/src/lib/kioskI18n.ts` — keyed `kt()` lookup for all 13 languages
  (~45 UI strings); `AnatomyMap` labels expanded from 5 → 13 languages.
- **§2** `AnatomyFlow.tsx` now branches on `summary.isEmergency` into an Emergency
  screen: localized warning, Call 108 / Call 112 CTAs, "Find Nearest ER" (sorted by
  distance, call buttons), and **no** date/slot booking on the emergency path.
- **§3** `VoiceInterview`, `AnatomyMap`, `NonPartnerBooking`, `KioskLayout`,
  `LanguageSelect`, patient `KioskMode` all use `highContrast` (Easy Read button
  removed). Legacy `low-literacy` usage remains only in dead redirect stubs.
- **§4** `backend/app/routers/voice.py` → `POST /api/v1/voice/translate` proxies
  `BhashiniTranslation`; added `tests/test_bhashini.py` coverage (passthrough,
  same-lang, empty, HTTP proxy).
- **§5** `frontend/e2e/kiosk.spec.ts` fixed for responsive hero + run (6 pass);
  `backend/scripts/smoke_test.py` now covers the full kiosk journey + /voice/translate.
- **§6** `GOOGLE_PLACES_API_KEY` + `VITE_GOOGLE_MAPS_API_KEY` placed in git-ignored
  env files (key verified as valid; GCP billing must be enabled for live results —
  app degrades to demo hospitals, no failures).
- **§7** `database/medi_kiosk_advanced_features.sql` and both
  `database/mediflow_schema*.sql` cleaned; `grep -i delhi database/ supabase/` → empty.
- **§8** `.github/workflows/test.yml` gains a `frontend` job: `npm ci` → `tsc` →
  `build` → Playwright chromium e2e.
- **§9** `spec/kiosk.md` added (journey, languages, accessibility tokens, emergency
  routing, hospital/booking, data + test parity).

---

## Historical notes (all resolved — kept for context)

## §1 — True 13-language UI localization  *(High)*

### Gap
The kiosk UI used a `t(en, hi)` helper; any language other than `hi` fell back to
English. **Resolved** with `frontend/src/lib/kioskI18n.ts` (keyed `kt()` for 13
languages) and 13-language `AnatomyMap` labels.

## §2 — Emergency red-flag routing  *(High)*

### Gap
Backend correctly detected emergencies but the frontend ended emergency cases at
normal OPD booking. **Resolved** with a dedicated Emergency screen in `AnatomyFlow`
(ambulance calls + nearest-ER; no slot booking).

## §3 — High Contrast vs Low-Literacy conflict  *(High)*

### Gap
Kiosk screens keyed off `lowLiteracyMode` and hardcoded light backgrounds.
**Resolved** — every kiosk surface uses `highContrast` (Easy Read removed; the
patient lander now offers a High Contrast toggle).

## §4 — Add missing backend `/api/v1/voice/translate`  *(Medium)*

### Gap
`BhashiniService.translate()` hit a nonexistent endpoint. **Resolved** — real
`/api/v1/voice/translate` proxy added + tested.

## §5 — Run e2e / smoke tests  *(Medium)*

### Gap
Playwright never run; no full booking-path smoke. **Resolved** — Playwright suite
passes (6 tests) and is wired into CI; smoke test covers the kiosk journey.

## §6 — Live API keys + env wiring  *(Medium)*

### Gap
All AI/geo features ran on demo fallbacks. **Resolved** — Google key wired into
git-ignored envs. Note: enable **Billing** on the GCP project for live Places
results; otherwise the app degrades to demo hospitals without failing.

## §7 — Seed/deployment consistency  *(Medium)*

### Gap
Legacy SQL carried Delhi demo rows. **Resolved** — all `database/` SQL now Bangalore
(City Heart Hospital), matching `kiosk_data.py` and `seed.sql`.

## §8 — CI only covers backend  *(Low)*

### Gap
Frontend not built/typed in CI. **Resolved** — added frontend job (tsc + build +
Playwright e2e).

## §9 — Spec-vs-code audit  *(Low)*

### Gap
Spec not in repo; body map duplicated across kiosk files. **Resolved** —
`spec/kiosk.md` written; legacy `BodyMap.tsx`/`Interview.tsx` are dead redirects to
the combined flow; exit codes and parity documented.

---

## Suggested next-step order

All remaining items are complete. Recommended follow-ups, in order of impact:

1. Enable billing for the GCP project so Google Places / Maps return live results.
2. Point the frontend at a deployed backend (`VITE_API_URL`) for a full-stack run.
3. If a real kiosk is deployed: verify the 13-language audio path (ASR/NMT/TTS keys).

Every backend verification passes and is the baseline to keep green:
`cd backend && ./venv/bin/ruff check app tests && ./venv/bin/pytest`
62 passed. Frontend: `npm run build` + `npx tsc --noEmit` clean;
`cd frontend && npx playwright test` → 6 passed.
