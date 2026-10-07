"""Cardinal-temperature split used by the hydrothermal clock.

Below the base, nothing accumulates. Between base and optimum, the
clock runs faster as temperature rises. Above the optimum, two things
happen together (Alvarado & Bradford 2002):

1. The thermal factor stops rising and stays at (To - Tb).
2. Base water potential shifts upward by kT × (T - To), so the same
   soil feels drier to the seed.

At the ceiling the clock stops outright.
"""

from __future__ import annotations

from plant_sim.species import GerminationParams


def cardinal_terms(temperature_c: float, params: GerminationParams) -> tuple[float, float]:
    """Return (thermal factor in °C, water-potential offset in MPa)."""

    if temperature_c <= params.tb_c or temperature_c >= params.tc_c:
        return 0.0, 0.0
    if temperature_c <= params.to_c:
        return temperature_c - params.tb_c, 0.0
    span = params.to_c - params.tb_c
    offset = params.k_t_mpa_per_c * (temperature_c - params.to_c)
    return span, offset
