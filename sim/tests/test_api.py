import pytest
from fastapi.testclient import TestClient

from plant_sim.api import create_app


def client() -> TestClient:
    return TestClient(create_app())


def test_health_and_species_index():
    api = client()
    assert api.get("/api/health").json() == {"status": "ok"}
    species = api.get("/api/species").json()
    assert {item["id"] for item in species} == {"arabidopsis", "lettuce", "radish"}
    detail = api.get("/api/species/lettuce").json()
    assert detail["germination"]["k_t_mpa_per_c"] == 0.15
    assert api.get("/api/species/oak").status_code == 404


def test_encyclopedia_names_the_models():
    payload = client().get("/api/encyclopedia").json()
    ids = {card["id"] for card in payload["models"]}
    assert ids == {"hydrothermal", "imbibition", "seedling", "respiration"}
    assert any(phase["id"] == "activation" for phase in payload["phases"])
    assert payload["water_scale"][1]["label"] == "Field capacity"


def test_post_simulate_returns_a_readable_trajectory():
    response = client().post(
        "/api/simulate",
        json={
            "species_ids": ["radish", "lettuce"],
            "temperature_c": 20,
            "water_potential_mpa": -0.02,
            "duration_h": 96,
            "n_points": 25,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["comparison"]
    assert "radish" in body["comparison"] or "lettuce" in body["comparison"]
    radish = next(run for run in body["runs"] if run["species_id"] == "radish")
    assert radish["t50_h"] == pytest.approx(49.17, abs=0.1)
    assert len(radish["samples"]) == 25
    assert "radicle" in radish["narrative"]["plain"]
    assert "dose" in radish["narrative"]["physics"]


def test_hot_lettuce_narrative_says_the_median_never_finishes():
    body = client().post(
        "/api/simulate",
        json={"species_ids": ["lettuce"], "temperature_c": 31, "water_potential_mpa": 0},
    ).json()
    run = body["runs"][0]
    assert run["t50_h"] is None
    assert "never finishes" in run["narrative"]["plain"]
    assert "thermoinhibition" in run["narrative"]["physics"]


def test_websocket_recomputes_and_rejects_a_bad_message():
    api = client()
    with api.websocket_connect("/api/ws") as socket:
        socket.send_json({"type": "ping"})
        error = socket.receive_json()
        assert error["type"] == "error"

        socket.send_json(
            {
                "type": "simulate",
                "request_id": "abc",
                "species_ids": ["arabidopsis"],
                "temperature_c": 15,
                "water_potential_mpa": 0,
                "duration_h": 48,
                "n_points": 5,
            }
        )
        result = socket.receive_json()
        assert result["type"] == "result"
        assert result["request_id"] == "abc"
        assert result["runs"][0]["t50_h"] == pytest.approx(27.006, abs=0.01)

        socket.send_json(
            {
                "type": "simulate",
                "request_id": "nope",
                "species_ids": ["oak"],
                "temperature_c": 20,
                "water_potential_mpa": 0,
            }
        )
        missing = socket.receive_json()
        assert missing["type"] == "error"
        assert missing["request_id"] == "nope"
