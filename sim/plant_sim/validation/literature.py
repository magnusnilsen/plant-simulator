"""Compare the simulator with published germination numbers.

Two different jobs live here, and they must not be confused:

1. Recovery. Feed the model a curve it itself produced. Error should be
   numerical dust. This checks the scorer, not the biology.

2. Literature. Khan et al. 2022 published a hydrothermal-time fit for
   radish and, separately, a handful of germination percentages in the
   text. We score those percentages with their Table 3 parameters.
   The fit is weak (they report R² = 0.53), and one structural problem
   is visible without any statistics: their base temperature is 15°C,
   which is also the coldest treatment they ran, so the clock is stopped
   in the very condition where they observed about 40% germination.
"""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path

from plant_sim.environment import Environment
from plant_sim.models.hydrothermal import (
    final_germination_fraction,
    germination_fraction,
    time_to_fraction,
)
from plant_sim.paths import validation_dir
from plant_sim.species import GerminationParams
from plant_sim.validation.metrics import r_squared, rmse


@dataclass(frozen=True)
class Observation:
    temperature_c: float
    water_potential_mpa: float
    germination_fraction: float
    hours: float | None
    source: str
    use: bool


@dataclass(frozen=True)
class ScoredRow:
    observation: Observation
    predicted: float


@dataclass(frozen=True)
class LiteratureScore:
    fit_id: str
    rows: list[ScoredRow]
    rmse: float
    r_squared: float | None
    interpretation: str

    @property
    def used(self) -> list[ScoredRow]:
        return [row for row in self.rows if row.observation.use]


def load_fit(path: Path) -> GerminationParams:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return GerminationParams.model_validate(payload["germination"])


def load_observations(path: Path) -> list[Observation]:
    rows: list[Observation] = []
    with path.open(encoding="utf-8", newline="") as handle:
        for record in csv.DictReader(handle):
            hours = record["hours"].strip()
            rows.append(
                Observation(
                    temperature_c=float(record["temperature_c"]),
                    water_potential_mpa=float(record["water_potential_mpa"]),
                    germination_fraction=float(record["germination_fraction"]),
                    hours=float(hours) if hours else None,
                    source=record["source"],
                    use=record["use"].strip() in {"1", "true", "True", "yes"},
                )
            )
    return rows


def predict(params: GerminationParams, observation: Observation) -> float:
    environment = Environment(observation.temperature_c, observation.water_potential_mpa)
    if observation.hours is None:
        return final_germination_fraction(environment, params)
    return germination_fraction(observation.hours, environment, params)


def score_fit(fit_id: str, params: GerminationParams, observations: list[Observation]) -> LiteratureScore:
    rows = [ScoredRow(observation, predict(params, observation)) for observation in observations]
    used = [row for row in rows if row.observation.use]
    if not used:
        raise ValueError(f"{fit_id} has no observations marked for scoring")
    observed = [row.observation.germination_fraction for row in used]
    predicted = [row.predicted for row in used]
    return LiteratureScore(
        fit_id=fit_id,
        rows=rows,
        rmse=rmse(observed, predicted),
        r_squared=r_squared(observed, predicted),
        interpretation=_interpret(params, used),
    )


def score_khan_2022() -> LiteratureScore:
    root = validation_dir()
    params = load_fit(root / "published_fits" / "radish_khan2022.json")
    observations = load_observations(root / "observations" / "radish_khan2022.csv")
    return score_fit("radish_khan2022", params, observations)


def synthetic_recovery_error() -> float:
    """RMSE of the model against a curve the model just generated."""

    from plant_sim.species import get_species

    params = get_species("lettuce").germination
    environment = Environment(18.0, -0.2)
    times = [6.0, 12.0, 24.0, 36.0, 48.0, 72.0, 120.0]
    observed = [germination_fraction(t, environment, params) for t in times]
    predicted = list(observed)
    return rmse(observed, predicted)


def khan_median_hours_at_20c() -> float | None:
    params = load_fit(validation_dir() / "published_fits" / "radish_khan2022.json")
    return time_to_fraction(0.5, Environment(20.0, 0.0), params)


def write_artifacts(directory: Path) -> LiteratureScore:
    directory.mkdir(parents=True, exist_ok=True)
    score = score_khan_2022()
    payload = {
        "fit_id": score.fit_id,
        "rmse": score.rmse,
        "r_squared": score.r_squared,
        "interpretation": score.interpretation,
        "rows": [
            {
                "temperature_c": row.observation.temperature_c,
                "water_potential_mpa": row.observation.water_potential_mpa,
                "observed": row.observation.germination_fraction,
                "predicted": row.predicted,
                "used": row.observation.use,
                "source": row.observation.source,
            }
            for row in score.rows
        ],
        "synthetic_recovery_rmse": synthetic_recovery_error(),
        "khan_t50_h_at_20c_free_water": khan_median_hours_at_20c(),
    }
    (directory / "report.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    (directory / "khan2022.svg").write_text(_scatter_svg(score), encoding="utf-8")
    return score


def _interpret(params: GerminationParams, used: list[ScoredRow]) -> str:
    cold = [
        row
        for row in used
        if row.observation.temperature_c <= params.tb_c and row.observation.germination_fraction > 0.2
    ]
    if cold:
        return (
            "The published base temperature is at or above a treatment where "
            "germination was actually observed, so the hydrothermal clock predicts "
            "zero there. The residual is the model structure, not a rounding error. "
            f"Reported R² for the original fit was 0.527."
        )
    return "Scored against the quoted final germination percentages."


def main() -> None:
    destination = validation_dir() / "plots"
    score = write_artifacts(destination)
    print(
        f"{score.fit_id}: RMSE={score.rmse:.3f} R2={score.r_squared} "
        f"wrote {destination}"
    )


def _scatter_svg(score: LiteratureScore) -> str:
    width, height = 420, 420
    pad = 48
    plot = width - 2 * pad

    def xy(fraction: float, predicted: float) -> tuple[float, float]:
        x = pad + fraction * plot
        y = height - pad - predicted * plot
        return x, y

    marks = []
    for row in score.rows:
        x, y = xy(row.observation.germination_fraction, max(0.0, min(1.0, row.predicted)))
        color = "#2f6f4e" if row.observation.use else "#a39a8c"
        marks.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="6" fill="{color}"/>')
    one = (
        f'<line x1="{pad}" y1="{height - pad}" x2="{pad + plot}" y2="{pad}" '
        'stroke="#1c2e24" stroke-dasharray="4 4"/>'
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">
  <rect width="100%" height="100%" fill="#f4f7f2"/>
  <text x="{pad}" y="28" fill="#1c2e24" font-family="Georgia, serif" font-size="16">Khan et al. 2022 radish, final germination</text>
  <text x="{width / 2}" y="{height - 12}" text-anchor="middle" fill="#1c2e24" font-size="12">observed fraction</text>
  <text x="16" y="{height / 2}" fill="#1c2e24" font-size="12" transform="rotate(-90 16 {height / 2})">predicted fraction</text>
  {one}
  {''.join(marks)}
</svg>
"""


if __name__ == "__main__":
    main()
