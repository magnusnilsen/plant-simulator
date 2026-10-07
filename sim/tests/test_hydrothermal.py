import math

import pytest

from plant_sim.environment import Environment
from plant_sim.models.hydrothermal import (
    final_germination_fraction,
    germination_fraction,
    hydrothermal_rate,
    median_progress,
    time_to_fraction,
)
from plant_sim.models.thermal import cardinal_terms
from plant_sim.species import get_species
from plant_sim.stats import norm_cdf, norm_ppf


def _params(species_id: str = "arabidopsis"):
    return get_species(species_id).germination


def test_normal_helpers_round_trip():
    assert norm_cdf(0.0) == pytest.approx(0.5)
    assert norm_ppf(0.5) == pytest.approx(0.0)
    assert norm_cdf(norm_ppf(0.1)) == pytest.approx(0.1)


def test_clock_is_stopped_at_or_below_base_and_at_ceiling():
    params = _params()
    for temperature in (params.tb_c - 5, params.tb_c, params.tc_c, params.tc_c + 2):
        env = Environment(temperature, 0.0)
        assert final_germination_fraction(env, params) == 0.0
        assert germination_fraction(100.0, env, params) == 0.0
        assert time_to_fraction(0.5, env, params) is None


def test_col0_median_matches_published_hydrotime_at_15c():
    """Footitt et al. 2019: θH = 34.352 MPa·h, ψb = −1.272 MPa at 15°C.

    On free water, t50 = θH / (0 − ψb).
    """

    params = _params("arabidopsis")
    env = Environment(15.0, 0.0)
    expected = 34.352 / 1.272
    assert time_to_fraction(0.5, env, params) == pytest.approx(expected, rel=1e-3)
    assert germination_fraction(expected, env, params) == pytest.approx(0.5, abs=1e-6)


def test_fraction_at_predicted_time_recovers_the_percentile():
    params = _params("lettuce")
    env = Environment(18.0, -0.15)
    for percentile in (0.1, 0.25, 0.5, 0.75, 0.9):
        hours = time_to_fraction(percentile, env, params)
        assert hours is not None
        assert germination_fraction(hours, env, params) == pytest.approx(percentile, abs=1e-6)


def test_median_progress_is_one_at_t50_and_zero_if_median_cannot():
    params = _params("radish")
    moist = Environment(20.0, -0.02)
    t50 = time_to_fraction(0.5, moist, params)
    assert t50 is not None
    assert median_progress(0.0, moist, params) == 0.0
    assert median_progress(t50, moist, params) == pytest.approx(1.0)
    assert median_progress(t50 / 2, moist, params) == pytest.approx(0.5)

    bone_dry = Environment(20.0, -2.5)
    assert time_to_fraction(0.5, bone_dry, params) is None
    assert median_progress(200.0, bone_dry, params) == 0.0


def test_wetter_soil_is_faster_and_never_lowers_the_final_fraction():
    params = _params("radish")
    dry = Environment(20.0, -0.7)
    wet = Environment(20.0, -0.05)
    assert final_germination_fraction(wet, params) >= final_germination_fraction(dry, params)
    wet_t50 = time_to_fraction(0.5, wet, params)
    dry_t50 = time_to_fraction(0.5, dry, params)
    assert wet_t50 is not None and dry_t50 is not None
    assert wet_t50 < dry_t50


def test_fraction_is_bounded_and_rises_with_time():
    params = _params("lettuce")
    temperatures = (8.0, 16.0, 20.0, 26.0, 31.0)
    potentials = (0.0, -0.2, -0.6, -1.2)
    for temperature in temperatures:
        for potential in potentials:
            env = Environment(temperature, potential)
            previous = 0.0
            final = final_germination_fraction(env, params)
            for hours in (0.0, 1.0, 6.0, 24.0, 72.0, 240.0, 2000.0):
                fraction = germination_fraction(hours, env, params)
                assert 0.0 <= fraction <= 1.0
                assert fraction >= previous - 1e-12
                assert fraction <= final + 1e-9
                previous = fraction
            assert germination_fraction(1e9, env, params) == pytest.approx(final, abs=1e-6)


def test_toward_optimum_speeds_the_median_when_water_is_free():
    params = _params("arabidopsis")
    cool = time_to_fraction(0.5, Environment(10.0, 0.0), params)
    warm = time_to_fraction(0.5, Environment(params.to_c, 0.0), params)
    assert cool is not None and warm is not None
    assert warm < cool


def test_rate_is_continuous_across_the_optimum():
    params = _params("lettuce")
    just_below = hydrothermal_rate(Environment(params.to_c, -0.1), params, params.psi_b50_mpa)
    just_above = hydrothermal_rate(
        Environment(params.to_c + 1e-6, -0.1),
        params,
        params.psi_b50_mpa,
    )
    assert just_above == pytest.approx(just_below, rel=1e-5)


def test_heat_shifts_base_water_potential_and_can_stop_a_wet_seed():
    params = _params("lettuce")
    cool = Environment(20.0, 0.0)
    hot = Environment(31.0, 0.0)
    assert final_germination_fraction(cool, params) > 0.95
    assert final_germination_fraction(hot, params) < 0.05
    thermal_hot, offset_hot = cardinal_terms(31.0, params)
    assert thermal_hot == pytest.approx(params.to_c - params.tb_c)
    assert offset_hot == pytest.approx(params.k_t_mpa_per_c * (31.0 - params.to_c))


def test_wider_spread_means_earlier_first_seeds_and_a_longer_tail():
    species = get_species("radish")
    narrow = species.germination.model_copy(update={"sigma_psi_b_mpa": 0.05})
    wide = species.germination.model_copy(update={"sigma_psi_b_mpa": 0.6})
    env = Environment(20.0, 0.0)
    assert time_to_fraction(0.1, env, wide) < time_to_fraction(0.1, env, narrow)
    assert time_to_fraction(0.9, env, wide) > time_to_fraction(0.9, env, narrow)


def test_a_seed_drier_than_its_threshold_has_zero_rate():
    params = _params()
    env = Environment(20.0, -0.5)
    assert hydrothermal_rate(env, params, psi_b_mpa=-0.4) == 0.0
    assert hydrothermal_rate(env, params, psi_b_mpa=-0.8) > 0.0


def test_time_to_fraction_rejects_endpoints():
    params = _params()
    env = Environment(20.0, 0.0)
    with pytest.raises(ValueError):
        time_to_fraction(0.0, env, params)
    with pytest.raises(ValueError):
        time_to_fraction(1.0, env, params)


def test_environment_bounds():
    with pytest.raises(ValueError):
        Environment(80.0, 0.0)
    with pytest.raises(ValueError):
        Environment(20.0, -4.0)


def test_no_nan_on_a_grid():
    params = _params("radish")
    for temperature in range(0, 45, 5):
        for potential_tenth in range(0, -20, -2):
            env = Environment(float(temperature), potential_tenth / 10)
            fraction = germination_fraction(36.0, env, params)
            assert math.isfinite(fraction)
