"""
Body-map endpoint tests (pure triage analysis, no database or network).
"""

import pytest
from fastapi import HTTPException

from app.routers.advanced import body_map_analysis


def test_body_map_chest_routes_to_cardiology():
    result = body_map_analysis("chest")
    assert result["body_part"] == "chest"
    assert result["suggested_department"] == "cardiology"
    assert result["risk_weight"] == 2
    assert isinstance(result["follow_up_questions"], list)
    assert len(result["follow_up_questions"]) > 0
    assert "Cardiology" in result["possible_specializations"]
    assert "Pulmonology" in result["possible_specializations"]


def test_body_map_returns_follow_up_questions():
    result = body_map_analysis("head")
    assert result["suggested_department"] == "neurology"
    assert "Neurology" in result["possible_specializations"]
    assert any("blurred vision" in q for q in result["follow_up_questions"])


def test_body_map_defaults_for_unmapped_taps():
    result = body_map_analysis("private")
    assert result["suggested_department"] == "general_medicine"
    assert result["risk_weight"] == 0


def test_body_map_unknown_part_raises_422():
    with pytest.raises(HTTPException) as exc:
        body_map_analysis("nonexistent_part")
    assert exc.value.status_code == 422
