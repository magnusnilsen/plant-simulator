# Models in phase 1

Phase 1 stops at the early seedling. The question it answers is: given a constant temperature and a constant soil water potential, when does the radicle come out, and what is the seed doing while it waits?

Four layers are stacked. They are not one coupled chemical simulation.

## 1. Hydrothermal time

A seed germinates when it has accumulated a fixed dose:

```
θ_HTT = (ψ − ψ_b(g) − offset) × thermal(T) × t_g
```

- `ψ` is the water potential of the surroundings, in megapascals. Zero is free water. Negative means the water is held more tightly.
- `ψ_b(g)` is the driest water potential at which seed fraction `g` can still germinate. It is drawn from a normal distribution with mean `ψ_b(50)` and width `σ`.
- Below the optimum, `thermal = T − Tb` and `offset = 0`.
- Above the optimum, `thermal` stops rising (it stays at `To − Tb`) and `offset = kT × (T − To)`. The seed's water threshold moves up. Wet paper can still be "too dry" for that seed. That is thermoinhibition.
- At or below `Tb`, or at or above `Tc`, the dose does not accumulate.

History, in the order the ideas were published:

- Garcia-Huidobro, Monteith, and Squire, 1982. Germination rate versus temperature is split at an optimum. Thermal time.
- Gummerson, 1986. The same idea for water potential, and the combination with temperature. Hydrothermal time, on sugar beet.
- Bradford, 1990. The population is a normal distribution of base water potentials. Three numbers (`θH`, `ψ_b(50)`, `σ`) reproduce a germination curve. The measurements were on lettuce, cv. Empire.
- Alvarado and Bradford, 2002. The heat shift in `ψ_b` explains why there is a ceiling temperature at all.

Physics analogy: integrate a driving force above a threshold until you hit a constant. Degree-days, if degree-days also cared how hard it was to pull water out of the soil. The bell curve is a tolerance stack. The sensitive tail fails first as the pot dries.

## 2. Imbibition

Water content follows the three phases in Bewley, Bradford, Hilhorst, and Nonogaki, *Seeds*, 3rd edition, 2013.

1. Phase I. Physical wetting. An exponential approach to a plateau. Warmer water is faster, with a mild Q10, because viscosity drops. Metabolism is not required.
2. Phase II. The plateau. Respiration and repair run. The length of this wait is decided by hydrothermal time, not by this curve.
3. Phase III. After the median radicle emerges, water content rises again because the seedling is growing new volume.

The shape of the plateau (about 0.62 on free water, on a 0–1 scale) is a textbook sketch. It is not a measured isotherm for these three species.

## 3. Elongation

After median emergence:

```
length = rate × thermal_factor(T) × water_factor(ψ) × hours_since_emergence
```

The thermal factor uses the same cardinal temperatures as germination. The water factor is 1 in moist soil and 0 at the species `psi_min`.

Lockhart, 1965, is the real biophysical model: growth needs turgor above a yield threshold, and the cell wall has to loosen. That equation is not what runs here. The coefficients are order-of-magnitude sketches so the picture has a root and a stem. Trust the clock more than the millimetres.

## 4. Respiration index

```
R = hydration × Q10^((T − 20) / 10)
```

Q10 = 2, the usual near-room-temperature rule of thumb (Atkin and Tjoelker, 2003). `R = 1` means wet and at 20°C. It is not a CO2 flux. A hot lettuce seed can still score high here while refusing to germinate. Being metabolically awake is not the same as crossing the germination threshold.

A Q10 of 2 near 20°C is what an Arrhenius factor looks like for an activation energy of roughly 50 kJ/mol. We do not fit an activation energy, and we do not track ATP, sugars, or the seed oils molecule by molecule. The oils are named in the species text so you know what the fuel is.

## What a water potential means in a pot

| Water potential | Garden sense |
| --- | --- |
| 0 MPa | Free water. A wet paper towel. |
| about −0.01 to −0.03 MPa | Field capacity. Watered, then drained. |
| −0.3 MPa | The pot is drying. Germination slows. |
| −1.5 MPa | Permanent wilting for many leaves. Most of these seeds will not finish. |

Laboratory PEG solutions of −0.2 to −0.6 MPa, which dominate papers, are already a dry soil. They are not "a bit thirsty."
