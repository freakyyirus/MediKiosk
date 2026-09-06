"""
Auth wiring tests — every backend route is gated correctly and the mock
login endpoint is gone.

Offline by design: conftest blanks the live Supabase env vars, so:
  * protected routes without a token -> 401 before any network call;
  * the legacy dev-only HS256 token is what passes the staff gate;
  * no GoTrue / ABDM / other network calls are made.
"""

from datetime import timedelta

from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import create_access_token
from app.utils.supabase_jwt import map_supabase_role, supabase_auth_enabled

client = TestClient(app, raise_server_exceptions=False)

_UNAUTHORIZED = {401, 403}


def test_mock_login_endpoint_is_removed():
    resp = client.post("/api/v1/auth/login", data={"username": "x", "password": "y"})
    assert resp.status_code == 404, "mock /api/v1/auth/login must be deleted"


def test_supabase_wires_are_offline_in_tests():
    assert supabase_auth_enabled() is False
    assert map_supabase_role({"role": "doctor"}) == "physician"
    assert map_supabase_role({"role": "hospital_admin"}) == "admin"
    assert map_supabase_role({"role": "patient"}) == "patient"
    assert map_supabase_role({"role": "super_admin"}) == "super_admin"
    assert map_supabase_role({}) == "patient"
    assert map_supabase_role(None) == "patient"


def test_physician_dashboard_requires_auth():
    assert client.get("/api/v1/physician/dashboard").status_code == 401


def test_documents_list_requires_staff():
    assert client.get("/api/v1/documents/session/1").status_code == 401


def test_patient_update_requires_staff():
    resp = client.patch("/api/v1/patients/1", json={"name": "Hacked"})
    assert resp.status_code == 401


def test_abdm_generate_fhir_requires_staff():
    resp = client.post("/api/v1/abdm/generate-fhir/1")
    assert resp.status_code == 401


def test_legacy_dev_physician_token_passes_staff_gate():
    """Dev-only fallback produces 401/403 for auth, never a pass for wrong role."""
    token = create_access_token(
        {"sub": "dr_test", "role": "physician"}, expires_delta=timedelta(minutes=5)
    )
    resp = client.get(
        "/api/v1/physician/dashboard", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code not in _UNAUTHORIZED  # auth OK; DB-down 500 expected offline


def test_legacy_dev_patient_token_is_rejected_on_staff_route():
    token = create_access_token(
        {"sub": "patient_test", "role": "patient"}, expires_delta=timedelta(minutes=5)
    )
    resp = client.get(
        "/api/v1/physician/dashboard", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 403


def test_public_kiosk_endpoints_are_not_authed():
    # Walk-up kiosk stays functional without any identity.
    resp = client.post("/api/v1/sessions", json={})
    assert resp.status_code not in _UNAUTHORIZED  # 422 validation (auth is fine)

    resp = client.get("/api/v1/patients?limit=5")
    assert resp.status_code not in _UNAUTHORIZED  # 500 (DB offline) not 401/403
