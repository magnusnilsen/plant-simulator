import json
import math

import pytest

from plant_sim.validation.literature import (
    khan_median_hours_at_20c,
    score_khan_2022,
    synthetic_recovery_error,
    write_artifacts,
)
from plant_sim.validation.metrics import r_squared, rmse


def test_metrics_on_a_perfect_line_and_a_flat_miss():
    assert rmse([0.0, 1.0], [0.0, 1.0]) == 0.0
    assert r_squared([0.0, 1.0, 0.5], [0.0, 1.0, 0.5]) == pytest.approx(1.0)
    assert r_squared([0.2, 0.2, 0.2], [0.2, 0.2, 0.2]) is None
    assert rmse([0.0, 0.0], [1.0, 1.0]) == pytest.approx(1.0)


def test_model_recovers_its_own_curve():
    assert synthetic_recovery_error() == pytest.approx(0.0, abs=1e-12)


def test_khan_fit_does_not_reproduce_the_quoted_germination():
    score = score_khan_2022()
    assert len(score.used) == 2
    assert len(score.rows) == 3
    cold = next(row for row in score.used if row.observation.temperature_c == 15)
    assert cold.predicted == 0.0
    assert cold.observation.germination_fraction == pytest.approx(0.4067)
    assert score.rmse > 0.2
    assert score.r_squared is not None
    assert score.r_squared < 0.5
    assert "base temperature" in score.interpretation


def test_khan_parameters_make_radish_implausibly_slow():
    """θHTT = 1008 with only 5°C of thermal time at 20°C stretches t50 for weeks."""

    hours = khan_median_hours_at_20c()
    assert hours is not None
    assert hours > 400
    assert hours / 24 > 16


def test_artifacts_write_report_and_svg(tmp_path):
    score = write_artifacts(tmp_path)
    report = json.loads((tmp_path / "report.json").read_text(encoding="utf-8"))
    assert report["fit_id"] == "radish_khan2022"
    assert report["rmse"] == pytest.approx(score.rmse)
    assert math.isfinite(report["synthetic_recovery_rmse"])
    svg = (tmp_path / "khan2022.svg").read_text(encoding="utf-8")
    assert svg.startswith("<svg")
    assert svg.count("<circle") == 3
