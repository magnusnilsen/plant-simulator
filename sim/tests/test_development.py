import math

import pytest

from plant_sim.environment import Environment
from plant_sim.models.hydrothermal import time_to_fraction
from plant_sim.models.imbibition import (
    PLATEAU_AT_FULL_HYDRATION,
    moisture_content,
    physical_imbibition_hours,
    plateau_moisture,
    tau_hours,
)
from plant_sim.models.seedling import elongation_mm, respiration_index, thermal_growth_factor
from plant_sim.models.simulate import simulate
from plant_sim.species import get_species


def test_dry_seed_starts_at_its_stored_moisture_and_approaches_a_plateau():
    species = get_species("radish")
    env = Environment(20.0, 0.0)
    assert moisture_content(0.0, env, species.imbibition, germination_h=100.0) == pytest.approx(
        species.imbibition.m_initial
    )
    halfway = physical_imbibition_hours(env, species.imbibition) / 2
    mid = moisture_content(halfway, env, species.imbibition, germination_h=100.0)
    later = moisture_content(80.0, env, species.imbibition, germination_h=100.0)
    assert species.imbibition.m_initial < mid < later
    assert later == pytest.approx(PLATEAU_AT_FULL_HYDRATION, abs=0.02)


def test_phase_three_rises_above_the_plateau_after_emergence():
    species = get_species("lettuce")
    env = Environment(20.0, 0.0)
    emerged = 30.0
    before = moisture_content(emerged - 0.1, env, species.imbibition, emerged)
    after = moisture_content(emerged + 40.0, env, species.imbibition, emerged)
    assert after > before + 0.1
    assert after < 1.0


def test_warmer_water_wets_the_seed_faster():
    species = get_species("arabidopsis")
    cool = Environment(10.0, 0.0)
    warm = Environment(25.0, 0.0)
    assert tau_hours(25.0, species.imbibition) < tau_hours(10.0, species.imbibition)
    cool_m = moisture_content(1.5, cool, species.imbibition, germination_h=None)
    warm_m = moisture_content(1.5, warm, species.imbibition, germination_h=None)
    assert warm_m > cool_m


def test_dry_soil_holds_the_plateau_down():
    species = get_species("radish")
    wet = plateau_moisture(Environment(20.0, -0.02), species.imbibition)
    dry = plateau_moisture(Environment(20.0, -1.6), species.imbibition)
    assert dry < species.imbibition.h_metabolism < wet


def test_root_is_zero_until_the_median_emerges_then_grows():
    species = get_species("radish")
    env = Environment(20.0, -0.02)
    t50 = time_to_fraction(0.5, env, species.germination)
    assert t50 is not None
    assert (
        elongation_mm(
            t50,
            t50,
            env,
            species.germination,
            species.seedling,
            species.seedling.root_mm_per_degree_h,
        )
        == 0.0
    )
    later = elongation_mm(
        t50 + 24.0,
        t50,
        env,
        species.germination,
        species.seedling,
        species.seedling.root_mm_per_degree_h,
    )
    assert later > 5.0


def test_no_elongation_below_base_temperature_or_in_a_drought():
    species = get_species("lettuce")
    assert thermal_growth_factor(species.germination.tb_c, species.germination) == 0.0
    env = Environment(20.0, species.seedling.psi_min_mpa)
    length = elongation_mm(
        100.0,
        10.0,
        env,
        species.germination,
        species.seedling,
        species.seedling.root_mm_per_degree_h,
    )
    assert length == 0.0


def test_respiration_is_off_when_dry_and_rises_with_temperature_when_wet():
    assert respiration_index(0.1, 20.0, metabolism_threshold=0.35, q10=2.0) == 0.0
    cool = respiration_index(0.7, 20.0, metabolism_threshold=0.35, q10=2.0)
    warm = respiration_index(0.7, 30.0, metabolism_threshold=0.35, q10=2.0)
    assert warm == pytest.approx(cool * 2.0)


def test_trajectory_walks_imbibition_activation_emergence_seedling():
    species = get_species("radish")
    env = Environment(20.0, -0.02)
    run = simulate(species, env, duration_h=120.0, n_points=241)
    phases = [sample.phase for sample in run.samples]
    assert phases[0] == "imbibition"
    assert "activation" in phases
    assert "emergence" in phases
    assert phases[-1] == "seedling"
    assert run.t50_h == pytest.approx(48.0, rel=0.05)
    assert run.final_fraction > 0.95
    moistures = [sample.moisture for sample in run.samples]
    assert max(moistures) < 1.0
    assert all(math.isfinite(sample.root_mm) for sample in run.samples)
    roots = [sample.root_mm for sample in run.samples]
    assert roots == sorted(roots)


def test_hot_lettuce_stays_alive_but_the_median_never_emerges():
    species = get_species("lettuce")
    run = simulate(species, Environment(31.0, 0.0), duration_h=96.0, n_points=49)
    assert run.t50_h is None
    assert run.final_fraction < 0.05
    assert run.samples[-1].root_mm == 0.0
    assert run.samples[-1].respiration_index > 0.0
    assert run.samples[-1].phase == "activation"


def test_bone_dry_soil_is_blocked():
    species = get_species("arabidopsis")
    run = simulate(species, Environment(22.0, -2.2), duration_h=72.0, n_points=25)
    # A normal distribution has an absurd tail of infinitely drought-tolerant
    # seeds. Anything below a tenth of a percent is not a germination event.
    assert run.final_fraction < 1e-3
    assert {sample.phase for sample in run.samples} == {"blocked"}
    assert run.samples[-1].respiration_index == 0.0


def test_simulate_rejects_empty_runs():
    species = get_species("radish")
    with pytest.raises(ValueError):
        simulate(species, Environment(20.0, 0.0), duration_h=0.0)
    with pytest.raises(ValueError):
        simulate(species, Environment(20.0, 0.0), n_points=1)
