"""
Session router tests (pure logic — no database required).

Covers the valid status-state machine and the structured-clinical persistence
helper that replaces the old "# TODO: Process through LLM for clinical
structuring" placeholder.
"""

from app.models.session import Session
from app.routers.sessions import VALID_TRANSITIONS, _apply_clinical, is_valid_transition


def test_valid_transitions_from_in_progress():
    assert is_valid_transition("in_progress", "completed")
    assert is_valid_transition("in_progress", "cancelled")
    assert not is_valid_transition("in_progress", "in_progress")
    assert not is_valid_transition("in_progress", "reviewed")


def test_completed_moves_to_under_review_only():
    assert is_valid_transition("completed", "under_review")
    assert not is_valid_transition("completed", "reviewed")
    assert not is_valid_transition("completed", "in_progress")


def test_under_review_transitions():
    assert is_valid_transition("under_review", "reviewed")
    assert is_valid_transition("under_review", "in_progress")
    assert not is_valid_transition("under_review", "completed")


def test_terminal_states_are_terminal():
    for terminal in VALID_TRANSITIONS["reviewed"]:
        assert is_valid_transition("reviewed", terminal)
    for s in VALID_TRANSITIONS:
        assert not is_valid_transition("reviewed", s)
    assert not is_valid_transition("cancelled", "in_progress")


def test_unknown_transitions_are_rejected():
    assert not is_valid_transition("bogus", "completed")
    assert not is_valid_transition("in_progress", "bogus")


def test_apply_clinical_sets_session_fields():
    session = Session(
        patient_id=None,
        language="hi",
        department="allopathy",
        status="in_progress",
    )
    clinical = {
        "chief_complaint": "chest pain",
        "hpi": {"site": "central chest", "severity": 8},
        "symptoms": ["pain", "shortness of breath"],
        "confidence": 0.9,
    }
    _apply_clinical(session, clinical)

    assert session.chief_complaint == "chest pain"
    assert session.history_hpi == {"site": "central chest", "severity": 8}
    assert session.review_of_systems == ["pain", "shortness of breath"]
    assert session.llm_raw_response == str(clinical)
    assert round(session.confidence_score, 2) == round(0.9, 2)


def test_apply_clinical_ignores_empty():
    session = Session(
        patient_id=None,
        language="hi",
        department="allopathy",
        status="in_progress",
    )
    _apply_clinical(session, {})
    assert session.chief_complaint is None
    assert session.history_hpi is None
