"""Standard normal helpers. The seed lot is a bell curve of thresholds."""

from __future__ import annotations

from statistics import NormalDist

_UNIT = NormalDist(0.0, 1.0)


def norm_cdf(z: float) -> float:
    return _UNIT.cdf(z)


def norm_ppf(probability: float) -> float:
    if not 0.0 < probability < 1.0:
        raise ValueError("probability must be strictly between 0 and 1")
    return _UNIT.inv_cdf(probability)
