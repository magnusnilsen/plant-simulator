# Validation data

These tables are the numbers we are willing to stand behind, not a dump of every digit in a paper.

## Radish, Khan et al. 2022

Open paper: https://doi.org/10.1007/s42535-022-00490-4

Table 3 reports one hydrothermal-time fit:

| Parameter | Value |
| --- | --- |
| Tb, To, Tc | 15°C, 20°C, 40°C |
| θHTT | 1008 MPa·°C·h |
| ψb(50) | −0.41 MPa |
| σψb | 0.57 MPa |
| kT | 0.104 MPa/°C (labelled inconsistently in the paper) |
| R² | 0.527 |

The results text gives two germination percentages clearly enough to score:

- 40.67% at 15°C and −0.2 MPa
- 13% at 30°C and −0.6 MPa

The abstract also mentions 13% at 40°C and −0.8 MPa. The methods only test down to −0.6 MPa, so that row is stored and not scored.

Figures were not digitized. A weak R² and an inconsistent table are not improved by inventing points off a chart.

## What a good score would mean

Final germination at 15°C is a trap. If Tb is 15°C, the thermal factor (T − Tb) is zero, so the model predicts no germination in the treatment where the authors saw about 41%. That residual is expected. It is why the garden radish pack does not use this fit.

## Arabidopsis, Footitt et al. 2019

Not a separate CSV. The Col-0 hydrotime values are the species pack itself (ψb = −1.272 MPa, σ = 0.222 MPa, θH = 34.352 MPa·h at 15°C), and `test_hydrothermal.py` checks that the median time on free water matches θH / −ψb.
