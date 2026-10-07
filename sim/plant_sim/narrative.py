"""Plain-language reading of one incubation, for someone who knows physics."""

from __future__ import annotations

from plant_sim.environment import Environment
from plant_sim.models.hydrothermal import hydrothermal_rate
from plant_sim.models.simulate import Trajectory
from plant_sim.models.thermal import cardinal_terms
from plant_sim.species import Species


def soil_words(water_potential_mpa: float) -> str:
    """Map a water potential onto a watering can, not a lab bench.

    Field capacity, the wet-but-drained state of a pot, is about
    −0.01 to −0.03 MPa. Permanent wilting for many leaves is about
    −1.5 MPa. A PEG experiment at −0.4 MPa is already a dry soil,
    not a slightly thirsty one.
    """

    if water_potential_mpa >= -0.03:
        return "freshly watered soil"
    if water_potential_mpa >= -0.2:
        return "a pot that is starting to dry"
    if water_potential_mpa >= -0.8:
        return "dry soil"
    return "drought, near wilting"


def describe_run(species: Species, environment: Environment, trajectory: Trajectory) -> dict[str, str]:
    final_pct = round(trajectory.final_fraction * 100)
    place = soil_words(environment.water_potential_mpa)
    if trajectory.t50_h is None:
        plain = (
            f"The median {species.common_name.lower()} seed never finishes germination "
            f"at {environment.temperature_c:.0f}°C in {place} "
            f"({environment.water_potential_mpa:.2f} MPa). "
            f"About {final_pct}% of the packet is tolerant enough that it eventually would."
        )
    else:
        plain = (
            f"At {environment.temperature_c:.0f}°C in {place} "
            f"({environment.water_potential_mpa:.2f} MPa), the median "
            f"{species.common_name.lower()} seed pushes out a radicle at "
            f"{trajectory.t50_h:.0f} hours. About {final_pct}% of the packet "
            f"eventually germinates."
        )
    return {
        "plain": plain,
        "physics": _physics(species, environment, trajectory),
        "limit": _limit(species, environment),
    }


def compare_runs(species_by_id: dict[str, Species], trajectories: list[Trajectory]) -> str | None:
    finished = [(item.species_id, item.t50_h) for item in trajectories if item.t50_h is not None]
    if len(finished) < 2:
        return None
    finished.sort(key=lambda item: item[1])
    winner_id, hours = finished[0]
    winner = species_by_id[winner_id].common_name.lower()
    rest = ", ".join(
        f"{species_by_id[species_id].common_name.lower()} at {t50:.0f} h"
        for species_id, t50 in finished[1:]
    )
    return f"The median {winner} emerges first, at {hours:.0f} hours, before {rest}."


def _physics(species: Species, environment: Environment, trajectory: Trajectory) -> str:
    params = species.germination
    reason = _why_median_stopped(species, environment)
    if reason is not None:
        return (
            f"Hydrothermal time is a dose, like degree-days with an extra water term. "
            f"{reason} The lot needs {params.theta_htt_mpa_c_h:.0f} MPa·°C·h before the "
            f"median radicle appears, and right now that dose is not accumulating."
        )
    rate = hydrothermal_rate(environment, params, params.psi_b50_mpa)
    hours = params.theta_htt_mpa_c_h / rate
    return (
        "Hydrothermal time is a dose. Each hour adds "
        "(how far the soil water potential sits above that seed's threshold) "
        "times (degrees above the base temperature). "
        f"The median {species.common_name.lower()} needs {params.theta_htt_mpa_c_h:.0f} "
        f"MPa·°C·h and is accumulating about {rate:.2f} of those units per hour, "
        f"so the wait is {hours:.0f} hours. "
        "The curve is not one seed repeated: thresholds are a bell curve, "
        f"mean {params.psi_b50_mpa:.2f} MPa, spread {params.sigma_psi_b_mpa:.2f} MPa."
    )


def _why_median_stopped(species: Species, environment: Environment) -> str | None:
    params = species.germination
    temperature = environment.temperature_c
    if temperature <= params.tb_c:
        return (
            f"Temperature is at or below the base ({params.tb_c:.0f}°C), "
            "so the thermal factor is zero. This is the same idea as a reaction "
            "that cannot run because you are below the threshold, not because time is short."
        )
    if temperature >= params.tc_c:
        return (
            f"Temperature is at or above the ceiling ({params.tc_c:.0f}°C). "
            "The clock is defined to stop there."
        )
    _thermal, offset = cardinal_terms(temperature, params)
    hydro = environment.water_potential_mpa - offset - params.psi_b50_mpa
    if hydro <= 0.0 and offset > 0.0:
        return (
            "It is warm enough that the seed's water threshold has shifted upward "
            f"by {offset:.2f} MPa (kT × degrees above the optimum). "
            "The soil can be wet and still sit on the wrong side of that new threshold. "
            "That is thermoinhibition."
        )
    if hydro <= 0.0:
        return (
            f"The soil ({environment.water_potential_mpa:.2f} MPa) is drier than the "
            f"median seed's base water potential ({params.psi_b50_mpa:.2f} MPa). "
            "Water potential is the chemical potential of water: more negative means "
            "the soil is holding water in a deeper well, and the seed cannot pull it out."
        )
    return None


def _limit(species: Species, environment: Environment) -> str:
    if environment.temperature_c > species.germination.to_c and species.id == "lettuce":
        return (
            "Heat failure here is a threshold shift, not a dead enzyme drawn molecule "
            "by molecule. Different lettuce varieties have different slopes."
        )
    return (
        "Timing uses hydrothermal time. The picture of water entering the seed is a "
        "separate, simpler curve of the three classic phases. It does not vote on "
        "when the radicle appears."
    )
