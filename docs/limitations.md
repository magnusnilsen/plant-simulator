# Where phase 1 is strong, and where it is not

## Strong

Temperature and soil moisture, acting together, on the time to radicle emergence. That interaction is the thing hydrothermal time was built for, and it is the thing you feel when a sowing fails.

The population. A packet is not one seed. Drying the soil does not delay everyone equally. It removes the sensitive tail, so the final percentage falls, not just the speed.

Lettuce and heat. Thermoinhibition — wet, warm, and still no germination — is a real and famous failure, and the model produces it by shifting the water threshold rather than by killing the seed.

Arabidopsis Col-0, after dormancy has been removed, at 15°C on free water. The median time matches the hydrotime constant published by Footitt et al. 2019 (`θH = 34.352 MPa·h`, `ψb = −1.272 MPa`). See the test `test_col0_median_matches_published_hydrotime_at_15c`.

## Weak, on purpose

The garden radish and lettuce speeds are calibrated to a sensible sowing window, not fitted to one public germination curve. Each number in the species file has a confidence tag. `illustrative` means the picture needed a coefficient and the literature did not hand us one.

Khan et al. 2022 did publish a hydrothermal fit for radish. It is scored in `data/validation`, and it does not describe ordinary packet seed. Their base temperature is 15°C, which is also the coldest treatment they ran, so the clock predicts no germination in a treatment where they saw about 41%. They report R² = 0.53. The garden radish pack does not use that fit. The failure is kept visible so a published table is not treated as ground truth.

Millimetres of root and hypocotyl. Useful for the drawing. Not a measurement.

The respiration index. A temperature rule of thumb times a wetness factor. No biochemistry.

## Not in this phase at all

- Light. Lettuce and Arabidopsis both use phytochrome. A dark sowing can fail for that reason alone.
- Dormancy as a process. Hormones (abscisic acid, gibberellin), after-ripening, and nitrate move `ψ_b` over days or seasons. Here `ψ_b` is a fixed property of the pack. The Arabidopsis pack is explicitly the non-dormant, cold-treated state.
- Soil as a material. No layers, no evaporation, no crust the radicle cannot push through. The slider is the water potential at the seed surface, already known.
- Oxygen. Waterlogged soil can stop a seed that the water-potential term says should be fine.
- Nutrients. Germination does not need fertilizer. The seedling, soon, does.
- Photosynthesis, true leaves, the swollen radish you eat, flowering, pollen.
- Wind, humidity of the air, and atmospheric pressure. They matter later for transpiration. They do not decide whether this seed germinates.
- Salt. A saline soil is a low water potential plus ion toxicity. Only the water potential is here.
- Differences among cultivars. The lettuce is a heat-sensitive one. A modern summer variety would need a smaller `kT`.

## How to read a result

If the page says the median seed never finishes, waiting longer will not help. Change temperature or water. If it gives a time, that time is the middle of the packet, and the curve shows the early and late seeds. The confidence tags under "How this step is modelled" tell you which of those numbers came from a table and which were chosen so the story would sit on the right timescale.
