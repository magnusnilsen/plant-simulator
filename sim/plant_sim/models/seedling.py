"""Early seedling elongation after the median radicle emerges.

Growth rate follows the same cardinal temperatures as germination:
it rises from Tb to To, then falls to zero at Tc. Drought scales the
rate down linearly between a moist soil (−0.05 MPa) and psi_min.

This is thermal time, not a Lockhart (1965) cell-expansion model.
There is no yield threshold, no wall extensibility, and no soil
strength. Lengths are millimetres of a typical early root or hypocotyl.
"""

from __future__ import annotations

from plant_sim.environment import Environment
from plant_sim.species import GerminationParams, SeedlingParams

MOIST_REFERENCE_MPA = -0.05


def thermal_growth_factor(temperature_c: float, germination: GerminationParams) -> float:
    """Degree-hours accumulated per hour of clock time. Zero outside Tb–Tc."""

    if temperature_c <= germination.tb_c or temperature_c >= germination.tc_c:
        return 0.0
    if temperature_c <= germination.to_c:
        return temperature_c - germination.tb_c
    span = germination.to_c - germination.tb_c
    decline = (germination.tc_c - temperature_c) / (germination.tc_c - germination.to_c)
    return span * decline


def water_growth_factor(water_potential_mpa: float, psi_min_mpa: float) -> float:
    if water_potential_mpa >= MOIST_REFERENCE_MPA:
        return 1.0
    if water_potential_mpa <= psi_min_mpa:
        return 0.0
    return (water_potential_mpa - psi_min_mpa) / (MOIST_REFERENCE_MPA - psi_min_mpa)


def elongation_mm(
    time_h: float,
    germination_h: float | None,
    environment: Environment,
    germination: GerminationParams,
    seedling: SeedlingParams,
    mm_per_degree_h: float,
) -> float:
    if germination_h is None or time_h <= germination_h:
        return 0.0
    rate = (
        mm_per_degree_h
        * thermal_growth_factor(environment.temperature_c, germination)
        * water_growth_factor(environment.water_potential_mpa, seedling.psi_min_mpa)
    )
    return rate * (time_h - germination_h)


def respiration_index(
    moisture: float,
    temperature_c: float,
    metabolism_threshold: float,
    q10: float,
) -> float:
    """Relative respiration. 1 means 'wet, and at 20°C'.

    Thermoinhibition does not zero this. A hot lettuce seed can still
    be alive and respiring while refusing to complete germination.
    """

    if moisture < metabolism_threshold:
        return 0.0
    span = max(1e-6, 1.0 - metabolism_threshold)
    hydration = min(1.0, (moisture - metabolism_threshold) / span)
    thermal = q10 ** ((temperature_c - 20.0) / 10.0)
    return hydration * thermal
