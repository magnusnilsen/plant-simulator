import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from plant_sim.species import REQUIRED_PARAMETERS, Species, get_species, load_species


def test_three_species_load_with_matching_filenames():
    catalogue = load_species()
    assert set(catalogue) == {"arabidopsis", "lettuce", "radish"}
    assert catalogue["lettuce"].scientific_name == "Lactuca sativa"
    assert catalogue["radish"].family == "Brassicaceae"
    assert catalogue["arabidopsis"].family == "Brassicaceae"


def test_every_parameter_has_one_provenance_tag():
    for species in load_species().values():
        tagged = [item.parameter for item in species.provenance]
        assert tagged == list(dict.fromkeys(tagged))
        assert set(tagged) == set(REQUIRED_PARAMETERS)


def test_cardinals_and_signs_are_biological():
    for species in load_species().values():
        germ = species.germination
        assert germ.tb_c < germ.to_c < germ.tc_c
        assert germ.psi_b50_mpa < -0.3
        assert germ.theta_htt_mpa_c_h > 100
        assert species.imbibition.m_initial < species.imbibition.h_metabolism


def test_get_species_unknown_id():
    with pytest.raises(KeyError, match="unknown species"):
        get_species("oak")


def test_schema_rejects_reversed_cardinals():
    species = get_species("radish").model_dump()
    species["germination"]["tb_c"] = 30
    species["germination"]["to_c"] = 20
    with pytest.raises(ValidationError, match="Tb < To < Tc"):
        Species.model_validate(species)


def test_schema_rejects_missing_provenance(tmp_path: Path):
    species = get_species("lettuce").model_dump()
    species["provenance"] = [
        item for item in species["provenance"] if item["parameter"] != "germination.tb_c"
    ]
    path = tmp_path / "lettuce.json"
    path.write_text(json.dumps(species), encoding="utf-8")
    with pytest.raises(ValidationError, match="missing provenance"):
        Species.model_validate_json(path.read_text(encoding="utf-8"))


def test_schema_rejects_unknown_field():
    species = get_species("arabidopsis").model_dump()
    species["germination"]["magic"] = 1
    with pytest.raises(ValidationError):
        Species.model_validate(species)
