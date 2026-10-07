"""Locate repository data without assuming the process was started in the root."""

from __future__ import annotations

import os
from pathlib import Path


def repo_root() -> Path:
    override = os.environ.get("PLANT_SIM_ROOT")
    if override:
        root = Path(override).expanduser().resolve()
        if not (root / "data" / "species").is_dir():
            raise FileNotFoundError(f"PLANT_SIM_ROOT={root} has no data/species directory")
        return root

    here = Path(__file__).resolve()
    for candidate in here.parents:
        if (candidate / "data" / "species").is_dir():
            return candidate
    raise FileNotFoundError(
        "Could not find data/species. Run from the repository, or set PLANT_SIM_ROOT."
    )


def species_dir() -> Path:
    return repo_root() / "data" / "species"


def validation_dir() -> Path:
    return repo_root() / "data" / "validation"
