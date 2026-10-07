"""Error metrics for a germination prediction against observations."""

from __future__ import annotations

import math


def rmse(observed: list[float], predicted: list[float]) -> float:
    if len(observed) != len(predicted) or not observed:
        raise ValueError("observed and predicted must be the same non-empty length")
    return math.sqrt(sum((o - p) ** 2 for o, p in zip(observed, predicted, strict=True)) / len(observed))


def r_squared(observed: list[float], predicted: list[float]) -> float | None:
    """Coefficient of determination. None if the observations do not vary."""

    if len(observed) != len(predicted) or not observed:
        raise ValueError("observed and predicted must be the same non-empty length")
    mean = sum(observed) / len(observed)
    total = sum((o - mean) ** 2 for o in observed)
    # Identical observations have no variance. Binary fractions such as 0.2
    # leave a dust-sized total, which is still "no variance".
    if total <= 1e-12:
        return None
    residual = sum((o - p) ** 2 for o, p in zip(observed, predicted, strict=True))
    return 1.0 - residual / total
