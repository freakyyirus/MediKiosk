# Routing & Navigation Fixes — ROUTING_FIX.md

Status: STEP 1 of the incremental hardening roadmap. All changes are additive and
backward compatible; login/register, DB schemas, and existing routes are untouched.

## Problems found (audit)

1. **`/` always showed the landing/marketing page** even when an authenticated
   session existed. After logging in, pressing the browser **Back** button returned
   the user to `/` (or `/login`) instead of staying in their portal — appearing to
   "revert to the loading screen / landing" because the landing page mounts its
   `Preloader` overlay.
2. **Post-auth redirects used `push`** in several places (`LoginPage`, `RegisterPage`),
   so Back after login returned to the stale login/register form.
3. **`pages/landing/Nav.tsx` was missing its `useAuthStore` import** and called
   `require('../../stores/authStore').getRoleRedirect(role)` (a Node-ism Vite never
   polyfills). The landing "Dashboard" button was therefore dead at runtime and the
   file failed `tsc` (build block).
4. Back/forward at the portal level is otherwise **clean**: no `window.history.back()`,
   no `navigate(-1)`, no `window.location.href` anywhere in `frontend/src` (verified by
   grep). `BookOPD` already uses internal step-wise `goBack`/`goNext` (never browser back).

## Changes

### `frontend/src/App.tsx`
- New `HomeRedirect` component for `/`:
  - `isLoading` → brief spinner only while `authStore.initialize()` runs;
  - authenticated → `<Navigate to={getRoleRedirect(user.role)} replace />`
    (patient → `/patient/dashboard`, hospital admin → `/hospital/dashboard`, doctor →
    `/doctor/dashboard`);
  - anonymous → renders the `LandingPage` as before.
- `/` route now renders `<HomeRedirect />`. Consequence: once in a session, an
  authenticated user is never shown the marketing page or its Preloader when they hit
  `/` — Back from a portal page can no longer revert to the "loading/landing" screen.
  (Explicitly requested behavior.)

> **Update (Supabase-only auth):** Clerk has been removed from the frontend and the
> `/` route now always renders `<LandingPage />` (`HomeRedirect` deleted). The
> entry-to-landing flow described below is reversed: `/` always shows the marketing
> page + (back-button-replayed) Preloader.

### `frontend/src/pages/auth/LoginPage.tsx`
- Demo-login and Supabase sign-in navigations now use
  `navigate(..., { replace: true })` (2 call sites). The already-authenticated
  effect (lines 48–52) already used `replace`.

### `frontend/src/pages/auth/RegisterPage.tsx`
- `completeAuth` and Supabase registration navigation now use `{ replace: true }`
  (2 call sites).

### `frontend/src/pages/landing/Nav.tsx`
- Added `import { useAuthStore, getRoleRedirect } from '../../stores/authStore';`
- Replaced the `require(...)` call with a direct `getRoleRedirect(role)` call so the
  landing "Dashboard" button navigates to the correct post-auth dashboard again.

## Rules now enforced (see ARCHITECTURE.md §8)
- Auth/guard redirects use `replace()`.
- Normal navigation uses `push()` via `useNavigate` only.
- Never `window.location.*`.

## Verification
- `npm run build` → `tsc && vite build` pass (only pre-existing chunk-size +
  `INEFFECTIVE_DYNAMIC_IMPORT` warnings on `src/stores/index.ts`).
- Playwright checks in demo mode (see test evidence in STEP 07 / session output):
  - `GET /` while authenticated → redirected to `/patient/dashboard` (no landing, no
    preloader).
  - `GET /patient/visits` (patient) → renders portal page.
  - `GET /hospital/dashboard` while logged in as patient → redirected to
    `/unauthorized` (role guard).
  - Back button from a portal sub-page returns to the previous portal page, never to
    the landing/preloader/login screen.

## Remaining (later steps)
- `/patient/kiosk` authenticated kiosk route + `KioskLayout` (STEP 2).
- Route guards for legacy `/physician/*`, `/admin/*` (STEP 5).
- Centralized API client with 401/500 interceptors (STEP 6).