"""Three-phase wetting of a dry seed.

Bewley and Black's picture, as told in Bewley et al. 2013:

- Phase I is physical. Water moves in because the dry seed is a very
  low water potential. Metabolism is not required.
- Phase II is a plateau. The seed is wet enough for respiration and
  repair, and it waits here until the radicle can emerge.
- Phase III starts at radicle emergence. Growth makes new volume and
  water content rises again.

Emergence time is NOT computed here. Hydrothermal time decides that.
This curve only explains the water content you would weigh.

The plateau and the phase-III level are shared shape constants, not
fitted moisture isotherms. Species differ in how fast they wet (tau)
and in the water potential where hydration falls to zero.
"""

from __future__ import annotations

import math

from plant_sim.environment import Environment
from plant_sim.species import ImbibitionParams

# Relative water content (0–1) approached in a free-water incubation.
PLATEAU_AT_FULL_HYDRATION = 0.62
PHASE3_AT_FULL_HYDRATION = 0.90
REFERENCE_TEMPERATURE_C = 20.0


def equilibrium_factor(water_potential_mpa: float, psi_floor_mpa: float) -> float:
    """0 in bone-dry soil, 1 on free water. Linear on purpose."""

    if water_potential_mpa >= 0.0:
        return 1.0
    if water_potential_mpa <= psi_floor_mpa:
        return 0.0
    return (water_potential_mpa - psi_floor_mpa) / (0.0 - psi_floor_mpa)


def tau_hours(temperature_c: float, params: ImbibitionParams) -> float:
    """Wetting time constant. Warmer water is faster, via Q10."""

    factor = params.q10 ** ((temperature_c - REFERENCE_TEMPERATURE_C) / 10.0)
    return params.tau_h / max(factor, 1e-6)


def plateau_moisture(environment: Environment, params: ImbibitionParams) -> float:
    hydration = equilibrium_factor(environment.water_potential_mpa, params.psi_floor_mpa)
    return params.m_initial + (PLATEAU_AT_FULL_HYDRATION - params.m_initial) * hydration


def phase3_moisture(environment: Environment, params: ImbibitionParams) -> float:
    hydration = equilibrium_factor(environment.water_potential_mpa, params.psi_floor_mpa)
    return params.m_initial + (PHASE3_AT_FULL_HYDRATION - params.m_initial) * hydration


def moisture_content(
    time_h: float,
    environment: Environment,
    params: ImbibitionParams,
    germination_h: float | None,
) -> float:
    """Relative water content of the median seed."""

    if time_h <= 0.0:
        return params.m_initial
    tau = tau_hours(environment.temperature_c, params)
    plateau = plateau_moisture(environment, params)
    if germination_h is None or time_h <= germination_h:
        return _approach(time_h, params.m_initial, plateau, tau)
    at_emergence = _approach(germination_h, params.m_initial, plateau, tau)
    return _approach(time_h - germination_h, at_emergence, phase3_moisture(environment, params), tau)


def physical_imbibition_hours(environment: Environment, params: ImbibitionParams) -> float:
    """Time to cover 90% of the rise from dry seed to the phase-II plateau."""

    return -tau_hours(environment.temperature_c, params) * math.log(0.1)


def _approach(elapsed_h: float, start: float, target: float, tau_h: float) -> float:
    return target + (start - target) * math.exp(-elapsed_h / tau_h)
