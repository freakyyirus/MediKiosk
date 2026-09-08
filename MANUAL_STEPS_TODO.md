# Manual Steps To Do

This document tracks the final manual steps required to launch MediKiosk into production, as well as the next technical milestones to tackle.

## Next Up (Non-Blocking Features)
- [ ] **ABDM Wiring:** Move from sandbox credentials to full ABHA consent/artifact loop (requires registered HIP `X-HIP-ID` and callback endpoints).
- [ ] **Real Prescription-Image OCR Test:** Ensure OCR endpoints can handle real-world handwritten prescriptions reliably.
- [ ] **Full-Credentials E2E:** Setup full hospital flows requiring an authenticated demo user to test the complete loop.

## Deployment Blockers (Action Required)
- [ ] **Fix Render Backend Deployment:** Create the backend service on Render as a **Python Web Service** with the root directory set to `backend/`. This fixes the `npm start` error.
- [ ] **Configure Environment Variables:** Populate live environment variables on both Render and Vercel:
  - Supabase Keys (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_ANON_KEY`)
  - Gemini & Bhashini Keys
  - CORS Settings (`VITE_API_URL` on frontend, `CORS_ORIGINS` on backend)
- [ ] **Supabase Setup:** Run `supabase/schema.sql` in the Supabase SQL editor to create all tables. Manually create a private storage bucket named `medikiosk-documents`.

## Backend & Infrastructure Debt
- [ ] **Migrate Storage from MinIO to Supabase:** Change the `/documents/upload` route to save directly to the Supabase private bucket, as Render doesn't natively host MinIO on free tiers.
- [ ] **OCR RAM Usage:** Consider upgrading to a paid Starter instance (~$7/mo) on Render to prevent timeouts from heavy PyTorch dependencies used by EasyOCR.

## Product Polish
- [ ] **Seed Live Data:** Manually insert test data (Hospitals, Doctors, Departments, OPD Slots) via the Supabase table editor so the live app has data to display.
- [ ] **Enable GCP Billing:** Enable billing for Google Maps/Places API to fetch live nearby hospitals instead of the offline fallback data.
- [ ] **Hardware Audio Testing:** Test the 13-language audio path on physical Kiosk hardware in a noisy environment to verify Voice Activity Detection (WebRTCVAD) tuning.
