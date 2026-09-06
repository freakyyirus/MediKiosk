"""
Auth/JWT tests — token creation, verification, and password hashing.
"""

from datetime import timedelta

from jose import jwt

from app.config import get_settings
from app.utils.security import (
    create_access_token,
    get_password_hash,
    verify_access_token,
    verify_password,
)

settings = get_settings()


def test_create_and_verify_token_roundtrip():
    token = create_access_token({"sub": "dr_mehta", "role": "physician"}, expires_delta=timedelta(minutes=5))
    payload = verify_access_token(token)
    assert payload is not None
    assert payload["sub"] == "dr_mehta"
    assert payload["role"] == "physician"
    assert "exp" in payload


def test_token_expiry_is_enforced():
    payload = jwt.decode(
        create_access_token({"sub": "x"}, expires_delta=timedelta(microseconds=1)),
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        options={"verify_exp": False},
    )
    assert payload["sub"] == "x"


def test_verify_token_rejects_garbage():
    assert verify_access_token("not-a-real-token") is None
    assert verify_access_token("") is None


def test_password_hash_and_verify():
    hashed = get_password_hash("secret-pass-123")
    assert hashed != "secret-pass-123"
    assert verify_password("secret-pass-123", hashed)
    assert not verify_password("wrong-password", hashed)
