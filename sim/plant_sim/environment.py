"""Constant incubation environment for one germination run.

Soil is not a 3D flow model. Temperature and water potential are the
two numbers the seed is assumed to feel the whole time. Changing a
slider recomputes that whole incubation; it does not append weather
onto a seedling already in progress.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Environment:
    temperature_c: float
    water_potential_mpa: float

    def __post_init__(self) -> None:
        if not -5.0 <= self.temperature_c <= 60.0:
            raise ValueError("temperature must be between -5 and 60°C")
        if not -3.0 <= self.water_potential_mpa <= 0.1:
            raise ValueError("water potential must be between -3 and 0.1 MPa")
