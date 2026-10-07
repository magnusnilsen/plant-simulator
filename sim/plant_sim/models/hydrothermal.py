"""Population germination by hydrothermal time.

A seed fraction g germinates when it has accumulated a fixed dose of
hydrothermal time:

    θ_HTT = (ψ − ψ_b(g) − offset(T)) × thermal(T) × t_g

ψ_b(g) is normally distributed across the seed lot, with mean ψ_b(50)
and standard deviation σ_ψb (Gummerson 1986; Bradford 1990). The
temperature split, including the heat shift in ψ_b, follows Alvarado
and Bradford 2002.

Units: θ_HTT in MPa·°C·h, water potential in MPa, temperature in °C,
time in hours.
"""

from __future__ import annotations

from plant_sim.environment import Environment
from plant_sim.models.thermal import cardinal_terms
from plant_sim.species import GerminationParams
from plant_sim.stats import norm_cdf, norm_ppf


def hydrothermal_rate(
    environment: Environment,
    params: GerminationParams,
    psi_b_mpa: float,
) -> float:
    """Hydrothermal time gained per hour by a seed with this threshold.

    Zero means that seed never germinates in this environment.
    """

    thermal, offset = cardinal_terms(environment.temperature_c, params)
    if thermal <= 0.0:
        return 0.0
    hydro = environment.water_potential_mpa - offset - psi_b_mpa
    if hydro <= 0.0:
        return 0.0
    return hydro * thermal


def final_germination_fraction(environment: Environment, params: GerminationParams) -> float:
    """Fraction of the lot that will eventually germinate if you wait forever."""

    thermal, offset = cardinal_terms(environment.temperature_c, params)
    if thermal <= 0.0:
        return 0.0
    threshold = environment.water_potential_mpa - offset
    return _fraction_below(threshold, params)


def germination_fraction(
    time_h: float,
    environment: Environment,
    params: GerminationParams,
) -> float:
    """Fraction of the lot with a visible radicle by time_h."""

    if time_h <= 0.0:
        return 0.0
    thermal, offset = cardinal_terms(environment.temperature_c, params)
    if thermal <= 0.0:
        return 0.0
    # Seeds whose threshold lies below this value have already accumulated θ_HTT.
    threshold = environment.water_potential_mpa - offset - (
        params.theta_htt_mpa_c_h / (thermal * time_h)
    )
    return _fraction_below(threshold, params)


def time_to_fraction(
    fraction: float,
    environment: Environment,
    params: GerminationParams,
) -> float | None:
    """Hours until this percentile emerges. None if it never does."""

    if not 0.0 < fraction < 1.0:
        raise ValueError("fraction must be strictly between 0 and 1")
    psi_b = params.psi_b50_mpa + norm_ppf(fraction) * params.sigma_psi_b_mpa
    rate = hydrothermal_rate(environment, params, psi_b)
    if rate <= 0.0:
        return None
    return params.theta_htt_mpa_c_h / rate


def median_progress(time_h: float, environment: Environment, params: GerminationParams) -> float:
    """0–1 progress of the median seed toward radicle emergence.

    Stays 0 if the median seed cannot germinate. Caps at 1 after emergence.
    """

    if time_h <= 0.0:
        return 0.0
    median = time_to_fraction(0.5, environment, params)
    if median is None:
        return 0.0
    return min(1.0, time_h / median)


def _fraction_below(psi_b_threshold: float, params: GerminationParams) -> float:
    z = (psi_b_threshold - params.psi_b50_mpa) / params.sigma_psi_b_mpa
    return norm_cdf(z)
