"""Species parameter packs: numbers plus where each number came from."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from plant_sim.paths import species_dir

Confidence = Literal["high", "medium", "low", "illustrative"]

GERMINATION_PARAMETERS = (
    "germination.tb_c",
    "germination.to_c",
    "germination.tc_c",
    "germination.theta_htt_mpa_c_h",
    "germination.psi_b50_mpa",
    "germination.sigma_psi_b_mpa",
    "germination.k_t_mpa_per_c",
)

IMBIBITION_PARAMETERS = (
    "imbibition.m_initial",
    "imbibition.tau_h",
    "imbibition.q10",
    "imbibition.h_metabolism",
    "imbibition.psi_floor_mpa",
)

SEEDLING_PARAMETERS = (
    "seedling.root_mm_per_degree_h",
    "seedling.hypocotyl_mm_per_degree_h",
    "seedling.psi_min_mpa",
    "seedling.respiration_q10",
)

REQUIRED_PARAMETERS = GERMINATION_PARAMETERS + IMBIBITION_PARAMETERS + SEEDLING_PARAMETERS


class Provenance(BaseModel):
    model_config = ConfigDict(extra="forbid")

    parameter: str
    confidence: Confidence
    source: str
    year: int | None = None
    note: str


class Reference(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    citation: str
    year: int


class GerminationParams(BaseModel):
    """Hydrothermal-time parameters. See Alvarado & Bradford 2002."""

    model_config = ConfigDict(extra="forbid")

    tb_c: float
    to_c: float
    tc_c: float
    theta_htt_mpa_c_h: float = Field(gt=0)
    psi_b50_mpa: float = Field(lt=0)
    sigma_psi_b_mpa: float = Field(gt=0)
    k_t_mpa_per_c: float = Field(ge=0)

    @model_validator(mode="after")
    def cardinals_increase(self) -> GerminationParams:
        if not self.tb_c < self.to_c < self.tc_c:
            raise ValueError("cardinal temperatures must satisfy Tb < To < Tc")
        return self


class ImbibitionParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    m_initial: float = Field(ge=0, lt=1)
    tau_h: float = Field(gt=0)
    q10: float = Field(gt=1)
    h_metabolism: float = Field(gt=0, lt=1)
    psi_floor_mpa: float = Field(lt=0)


class SeedlingParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    root_mm_per_degree_h: float = Field(gt=0)
    hypocotyl_mm_per_degree_h: float = Field(gt=0)
    psi_min_mpa: float = Field(lt=0)
    respiration_q10: float = Field(gt=1)


class DisplayParams(BaseModel):
    """Drawing hints only. These do not enter the equations."""

    model_config = ConfigDict(extra="forbid")

    seed_length_mm: float = Field(gt=0)
    sowing_depth_mm: float = Field(ge=0)
    cotyledon_mm: float = Field(gt=0)
    root_span_mm: float = Field(gt=0)
    hypocotyl_span_mm: float = Field(gt=0)
    coat: str
    embryo: str
    stem: str
    accent: str


class Species(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    scientific_name: str
    common_name: str
    family: str
    summary: str
    reserves: str
    dormancy_note: str
    germination: GerminationParams
    imbibition: ImbibitionParams
    seedling: SeedlingParams
    display: DisplayParams
    provenance: list[Provenance]
    references: list[Reference]

    @model_validator(mode="after")
    def provenance_covers_parameters(self) -> Species:
        tagged = {item.parameter for item in self.provenance}
        missing = [name for name in REQUIRED_PARAMETERS if name not in tagged]
        if missing:
            raise ValueError(f"missing provenance for {', '.join(missing)}")
        unknown = sorted(tagged - set(REQUIRED_PARAMETERS))
        if unknown:
            raise ValueError(f"unknown provenance keys: {', '.join(unknown)}")
        if len(tagged) != len(self.provenance):
            raise ValueError("duplicate provenance parameter")
        return self


def load_species_file(path) -> Species:
    return Species.model_validate_json(path.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_species() -> dict[str, Species]:
    directory = species_dir()
    found: dict[str, Species] = {}
    for path in sorted(directory.glob("*.json")):
        species = load_species_file(path)
        if species.id in found:
            raise ValueError(f"duplicate species id {species.id}")
        if path.stem != species.id:
            raise ValueError(f"{path.name} must be named {species.id}.json")
        found[species.id] = species
    if not found:
        raise FileNotFoundError(f"no species packs in {directory}")
    return found


def get_species(species_id: str) -> Species:
    catalogue = load_species()
    try:
        return catalogue[species_id]
    except KeyError as exc:
        known = ", ".join(sorted(catalogue))
        raise KeyError(f"unknown species {species_id!r}. Known: {known}") from exc
