"""One incubation, from dry seed through the early seedling."""

from __future__ import annotations

from dataclasses import dataclass

from plant_sim.environment import Environment
from plant_sim.models.hydrothermal import (
    final_germination_fraction,
    germination_fraction,
    median_progress,
    time_to_fraction,
)
from plant_sim.models.imbibition import (
    moisture_content,
    physical_imbibition_hours,
    plateau_moisture,
)
from plant_sim.models.seedling import elongation_mm, respiration_index
from plant_sim.species import Species


@dataclass(frozen=True)
class Sample:
    time_h: float
    germination_fraction: float
    median_progress: float
    moisture: float
    phase: str
    root_mm: float
    hypocotyl_mm: float
    respiration_index: float


@dataclass(frozen=True)
class Trajectory:
    species_id: str
    temperature_c: float
    water_potential_mpa: float
    t50_h: float | None
    final_fraction: float
    samples: list[Sample]


def phase_name(
    time_h: float,
    germination_h: float | None,
    moisture: float,
    plateau: float,
    metabolism_threshold: float,
    imbibition_h: float,
) -> str:
    median_can_germinate = germination_h is not None
    too_dry = plateau < metabolism_threshold and moisture < metabolism_threshold
    if not median_can_germinate and too_dry:
        return "blocked"
    if germination_h is not None and time_h >= germination_h + 8.0:
        return "seedling"
    if germination_h is not None and time_h >= germination_h:
        return "emergence"
    if time_h < imbibition_h or moisture < metabolism_threshold:
        return "imbibition"
    return "activation"


def simulate(
    species: Species,
    environment: Environment,
    duration_h: float = 168.0,
    n_points: int = 169,
) -> Trajectory:
    if duration_h <= 0.0:
        raise ValueError("duration must be positive")
    if n_points < 2:
        raise ValueError("need at least two time points")

    germination_h = time_to_fraction(0.5, environment, species.germination)
    final_fraction = final_germination_fraction(environment, species.germination)
    imbibition_h = physical_imbibition_hours(environment, species.imbibition)
    plateau = plateau_moisture(environment, species.imbibition)
    samples: list[Sample] = []

    for index in range(n_points):
        time_h = duration_h * index / (n_points - 1)
        moisture = moisture_content(
            time_h,
            environment,
            species.imbibition,
            germination_h,
        )
        samples.append(
            Sample(
                time_h=time_h,
                germination_fraction=germination_fraction(
                    time_h, environment, species.germination
                ),
                median_progress=median_progress(time_h, environment, species.germination),
                moisture=moisture,
                phase=phase_name(
                    time_h,
                    germination_h,
                    moisture,
                    plateau,
                    species.imbibition.h_metabolism,
                    imbibition_h,
                ),
                root_mm=elongation_mm(
                    time_h,
                    germination_h,
                    environment,
                    species.germination,
                    species.seedling,
                    species.seedling.root_mm_per_degree_h,
                ),
                hypocotyl_mm=elongation_mm(
                    time_h,
                    germination_h,
                    environment,
                    species.germination,
                    species.seedling,
                    species.seedling.hypocotyl_mm_per_degree_h,
                ),
                respiration_index=respiration_index(
                    moisture,
                    environment.temperature_c,
                    species.imbibition.h_metabolism,
                    species.seedling.respiration_q10,
                ),
            )
        )

    return Trajectory(
        species_id=species.id,
        temperature_c=environment.temperature_c,
        water_potential_mpa=environment.water_potential_mpa,
        t50_h=germination_h,
        final_fraction=final_fraction,
        samples=samples,
    )
