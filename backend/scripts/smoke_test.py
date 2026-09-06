#!/usr/bin/env python3
"""
MediKiosk API smoke test — full click-through of the production surface.

Runs against a LIVE backend and prints a PASS/FAIL table. Exercises every
router: health → patients → sessions → messages → advanced (F1–F6) → ML.

Usage:
    python scripts/smoke_test.py                 # default http://localhost:8000
    python scripts/smoke_test.py --base https://x.up.railway.app
    python scripts/smoke_test.py --skip-db       # skip endpoints that need Postgres

Exit code 0 = every reachable check passed; 1 = one or more failed.
"""

import argparse
import sys

import httpx

PASS, FAIL = "PASS", "FAIL"
results: list[tuple[str, str, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    status = PASS if ok else FAIL
    results.append((name, status, detail))
    print(f"  [{status}] {name}" + (f"  — {detail}" if detail and not ok else ""))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:8000")
    parser.add_argument("--skip-db", action="store_true", help="Skip endpoints that require Postgres")
    args = parser.parse_args()
    base = args.base.rstrip("/")
    client = httpx.Client(base_url=base, timeout=30)

    print(f"MediKiosk API smoke test → {base}\n")

    try:
        # 0) Health / root
        r = client.get("/health")
        check("health /health", r.status_code == 200)
        r = client.get("/")
        check("root /", r.status_code == 200 and "MediKiosk" in r.text)

        if not args.skip_db:
            # 1) Patients CRUD
            pid = None
            r = client.post(
                "/api/v1/patients",
                json={"name": "Smoke Patient", "phone": "9999999999", "language_preference": "en"},
            )
            check("create patient", r.status_code in (200, 201), f"code={r.status_code} body={r.text[:160]}")
            if r.status_code in (200, 201):
                pid = r.json().get("id")
                r = client.get(f"/api/v1/patients/{pid}")
                check("get patient", r.status_code == 200)

            # 2) Session + conversation
            if pid:
                r = client.post("/api/v1/sessions", json={"patient_id": pid, "language": "en", "department": "allopathy"})
                check("create session", r.status_code in (200, 201), f"code={r.status_code} body={r.text[:160]}")
                sid = r.json().get("id") or r.json().get("session_id") if r.status_code in (200, 201) else None
                if sid:
                    r = client.post(
                        f"/api/v1/sessions/{sid}/messages",
                        json={"message_type": "patient_voice", "content": "Mujhe seene mein dard hota hai."},
                    )
                    check("add session message", r.status_code in (200, 201))
                    r = client.get(f"/api/v1/sessions/{sid}/history")
                    check("session history", r.status_code == 200)
                    r = client.post(
                        "/api/v1/consent/submit",
                        json={
                            "session_id": sid,
                            "consents": [{"consent_type": "data_capture", "granted": True}],
                        },
                    )
                    check("consent submit", r.status_code in (200, 201))

            # 2b) F6 erasure request → approve → hard delete (full DB-backed flow)
            if pid:
                r = client.post(
                    "/api/v1/advanced/retention/request-erasure",
                    json={
                        "patient_id": pid,
                        "data_types": ["voice_recording"],
                        "requested_by": "smoke-test",
                    },
                )
                check("F6 erasure request", r.status_code in (200, 201), f"code={r.status_code} body={r.text[:160]}")
                r = client.delete(
                    "/api/v1/advanced/retention/erase-patient",
                    json={
                        "patient_id": pid,
                        "reason": "smoke-test right-to-erasure",
                        "approval": True,
                    },
                )
                check("F6 erase-patient", r.status_code == 200 and r.json().get("status") == "erased", f"code={r.status_code} body={r.text[:160]}")
                r = client.get(f"/api/v1/patients/{pid}")
                check("patient gone after erase", r.status_code == 404)

                # Retention job needs Postgres too (real delete walks + audits)
                r = client.post("/api/v1/advanced/retention/run", json={"dry_run": True})
                check("F6 retention run (dry)", r.status_code == 200 and r.json().get("dry_run") is True, f"code={r.status_code} body={r.text[:160]}")

        # 3) Advanced features (all stateless/live-safe)
        r = client.post("/api/v1/advanced/body-map/tap", json={"body_part": "chest"})
        check("F1 body-map tap", r.status_code == 200 and r.json().get("suggested_department") == "cardiology")

        r = client.post("/api/v1/advanced/vitals/analyze", json={"spo2": 88, "pulse": 112, "bp_systolic": 150, "bp_diastolic": 95, "temperature": 38.0})
        check("F4 vitals analyze", r.status_code == 200 and r.json().get("severity") == "critical")

        r = client.post(
            "/api/v1/advanced/ml/predict-priority",
            json={
                "age": 58,
                "spo2": 88,
                "pulse": 112,
                "bp_systolic": 150,
                "bp_diastolic": 95,
                "red_flag_count": 1,
                "critical_symptom_count": 1,
                "has_chest_pain": True,
            },
        )
        check("ML predict-priority", r.status_code == 200 and "priority_class" in r.json(), f"code={r.status_code} body={r.text[:160]}")

        r = client.get("/api/v1/advanced/ml/dataset")
        check("ML dataset info", r.status_code == 200 and "real_samples" in r.json())

        r = client.post(
            "/api/v1/advanced/qr/create",
            json={
                "token_number": "OPD-123",
                "patient_name": "Smoke",
                "department": "cardiology",
                "priority": 3,
            },
        )
        check("F3 QR create", r.status_code == 200 and r.json().get("qr_code_data", "").startswith("MEDIKIOSK|"))

        r = client.post(
            "/api/v1/advanced/emergency/verify",
            json={
                "alert_type": "test",
                "symptoms": ["chest_pain"],
                "vitals": {"spo2": 90},
            },
        )
        check("F5 emergency verify", r.status_code == 200 and r.json().get("is_true_emergency") is True)

        r = client.get("/api/v1/advanced/retention/policies")
        check("F6 retention policies", r.status_code == 200 and len(r.json().get("policies", [])) >= 4)

        if not args.skip_db:
            r = client.get("/api/v1/advanced/retention/requests")
            check("F6 retention requests", r.status_code == 200)

        # 4) ML retraining path — ingest + retrain (small) + predict still works
        r = client.post(
            "/api/v1/advanced/ml/samples",
            json={
                "samples": [
                    {
                        "age": 30,
                        "spo2": 97,
                        "pulse": 72,
                        "bp_systolic": 118,
                        "bp_diastolic": 78,
                        "temperature": 36.7,
                        "red_flag_count": 0,
                        "critical_symptom_count": 0,
                        "has_chest_pain": False,
                        "has_breathlessness": False,
                        "priority_class": "low",
                    },
                    {
                        "age": 60,
                        "spo2": 89,
                        "pulse": 115,
                        "bp_systolic": 170,
                        "bp_diastolic": 105,
                        "temperature": 38.6,
                        "red_flag_count": 1,
                        "critical_symptom_count": 1,
                        "has_chest_pain": True,
                        "has_breathlessness": True,
                        "priority_class": "critical",
                    },
                ]
            },
        )
        check("ML ingest samples", r.status_code == 200 and r.json().get("accepted") == 2, f"code={r.status_code} body={r.text[:160]}")

        r = client.post("/api/v1/advanced/ml/train", json={"min_real": 20, "backfill_synthetic": 150, "holdout": 0.2})
        # Needs 20 real samples — with only 2 stored it 422s by design; accept 422 as "gate works".
        check("ML train gate (expects ≥20 real)", r.status_code in (200, 422), f"code={r.status_code} body={r.text[:160]}")

    except httpx.HTTPError as exc:
        check("network reachability", False, str(exc))

    print("\n── Summary ──────────────────────────────────────────────")
    failed = [r for r in results if r[1] == FAIL]
    print(f"  {len(results) - len(failed)}/{len(results)} checks passed")
    for name, status, detail in failed:
        print(f"  [FAIL] {name}: {detail}")

    print("\nNext: open /docs on the same host to walk the Swagger console." if not failed else "\nOne or more checks failed — see details above.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
