"""Model cards served to the interface. The equations live next to the code."""

from __future__ import annotations

MODEL_CARDS: list[dict] = [
    {
        "id": "hydrothermal",
        "name": "Hydrothermal time",
        "year": 2002,
        "developed_from": "Gummerson 1986 combined thermal time and hydrotime. Bradford 1990 put the population on a normal distribution of base water potentials. Alvarado and Bradford 2002 added the heat shift that creates a real optimum and a ceiling.",
        "equation": "θ_HTT = (ψ − ψ_b(g) − offset) × thermal(T) × t_g",
        "equation_note": "Below the optimum, offset is 0 and thermal is (T − Tb). Above the optimum, offset is kT × (T − To) and thermal stays at (To − Tb). ψ_b(g) = ψ_b(50) + probit(g) × σ.",
        "plain": "A seed germinates when it has accumulated enough 'wet-and-warm time'. Seeds in one packet do not share a single threshold. They form a bell curve, so you get a curve of germination, not a single click.",
        "physics": "Same shape as a dose. Integrate a driving force above a threshold until you hit a constant. Temperature enters like degree-days. Water potential enters like a pressure head above a personal minimum. The bell curve is a tolerance stack: the sensitive tail fails first as the soil dries.",
        "assumptions": [
            "Temperature and water potential are constant for the whole incubation.",
            "Base water potential is normally distributed and independent of time.",
            "The hydrothermal constant θ_HTT is the same for every seed in the lot.",
            "The seed is not dormant. Dormancy would show up as a higher ψ_b.",
        ],
        "limitations": [
            "No light, nitrate, or hormone circuit. Those move ψ_b in real Arabidopsis and lettuce.",
            "No soil hydraulics. The slider is the water potential at the seed, already known.",
            "The normal distribution has an unrealistic tail of infinitely tough seeds.",
        ],
    },
    {
        "id": "imbibition",
        "name": "Three-phase imbibition",
        "year": 2013,
        "developed_from": "The phase picture is classic seed physiology, set out for a general reader in Bewley, Bradford, Hilhorst and Nonogaki, Seeds, 3rd edition, 2013. The exponential wetting curve is a teaching model, not their equation.",
        "equation": "m(t) = m_eq + (m_start − m_eq) exp(−t / τ)",
        "equation_note": "τ shrinks as temperature rises, with a Q10, because warm water is less viscous. After radicle emergence the target steps up from the phase-II plateau to a higher water content.",
        "plain": "A dry seed is a sponge. Water rushes in (phase I) with almost no biochemistry. Then the water content pauses (phase II) while the embryo repairs itself and weakens the covering tissues. When the radicle breaks out, water content rises again (phase III) because the seedling is growing new volume.",
        "physics": "Phase I is diffusion and capillary filling into a dry porous solid. You do not need a living cell for it. The Q10 on wetting is a mild Arrhenius factor. Phase II is the interesting biological wait, and in this program that wait's length is decided by hydrothermal time, not by the moisture curve.",
        "assumptions": [
            "Equilibrium moisture falls in a straight line from free water down to none at −2 MPa.",
            "One time constant describes the whole seed.",
        ],
        "limitations": [
            "Real moisture isotherms are curved.",
            "The plateau level (about 0.62 on free water) is a textbook shape, not a measurement on these three species.",
            "Seed coats, mucilage, and soil contact are not modelled.",
        ],
    },
    {
        "id": "seedling",
        "name": "Thermal-time elongation",
        "year": 1965,
        "developed_from": "The idea that expansion needs turgor above a yield threshold is Lockhart 1965. What is implemented is much simpler: millimetres per degree-hour, multiplied by a straight water-stress factor, and only after the median seed has germinated.",
        "equation": "L = r × (T − Tb) × water(ψ) × (t − t_50)",
        "equation_note": "Above the optimum the (T − Tb) term declines linearly to zero at the ceiling. water(ψ) is 1 near −0.05 MPa and 0 at the species psi_min.",
        "plain": "Once the radicle is out, both the root and the hypocotyl (the embryonic stem) extend faster when it is warmer, until it is too hot, and slower when the soil is dry.",
        "physics": "Still a dose. Degree-hours times a coefficient gives millimetres. It is the plant-growth version of integrating a rate. It is not a force balance on a cell wall.",
        "assumptions": [
            "Only the median seed is drawn. The germination curve still shows the whole packet.",
            "Light does not change stem length.",
        ],
        "limitations": [
            "No Lockhart yield threshold, no wall loosening, no soil crust.",
            "Coefficients are order-of-magnitude sketches. Trust the timing more than the millimetres.",
            "The harvestable radish swelling, true leaves, and photosynthesis are later phases.",
        ],
    },
    {
        "id": "respiration",
        "name": "Lumped respiration index",
        "year": 2003,
        "developed_from": "Atkin and Tjoelker 2003 review the temperature response of plant respiration. A Q10 near 2 is the usual rule of thumb near room temperature. The index here is not their model.",
        "equation": "R = hydration × Q10^((T − 20) / 10)",
        "equation_note": "Hydration is 0 below the metabolism threshold and rises to 1 as relative water content approaches 1. Q10 is 2 for all three species.",
        "plain": "Dry enzymes do nothing. Once the seed is wet, respiration — burning stored oil and protein to make ATP — speeds up as the seed warms. The number is relative: 1 means wet and at 20°C. It is not a measured CO2 flux.",
        "physics": "Q10 is a local stand-in for an Arrhenius factor, k ∝ exp(−Ea / RT), over a narrow biological range. Doubling every 10°C is what an activation energy of roughly 50 kJ/mol looks like near 20°C. We do not fit Ea.",
        "assumptions": [
            "Stored reserves are not depleted. The index does not fall when the oil runs out.",
            "Thermoinhibition does not turn respiration off. A hot seed can be metabolically awake and still refuse to germinate.",
        ],
        "limitations": [
            "No ATP, no sugar, no mitochondria, no fermentation under low oxygen.",
            "The same Q10 is used from 5°C to 35°C. Real Q10 itself changes with temperature.",
        ],
    },
]

PHASES: list[dict] = [
    {
        "id": "imbibition",
        "title": "Phase I — water in",
        "plain": "The seed is filling. This part is physics. A dry seed coat and a dry embryo are far below the water potential of moist soil, so water moves in.",
        "physics": "Think of charging a capacitor, or saturating a dry porous rock. The amount of water approaches an equilibrium with a time constant. Biochemistry is optional.",
    },
    {
        "id": "activation",
        "title": "Phase II — the wait",
        "plain": "Water content has levelled off. Inside, repair and respiration have started, and the embryo is weakening the tissue that covers the radicle. Nothing looks dramatic from the outside.",
        "physics": "The hydrothermal dose is what ends this phase. Moisture is already near its plateau, so more clock time is not more water. It is more integrated progress above the thresholds.",
    },
    {
        "id": "emergence",
        "title": "Radicle emergence",
        "plain": "The median seed has just pushed the radicle through. By definition, germination is complete at this moment. A seedling is what happens next.",
        "physics": "Emergence is the instant the accumulated dose hits θ_HTT for g = 0.5. The curve on the screen shows the other percentiles arriving earlier and later.",
    },
    {
        "id": "seedling",
        "title": "Early seedling",
        "plain": "The root extends down and the hypocotyl lifts the cotyledons. The stored oil is still the fuel. Photosynthesis is not switched on in this phase of the model.",
        "physics": "Length is another integral: rate times time since emergence. The rate is degree-hours per hour, cut back if the soil is dry.",
    },
    {
        "id": "blocked",
        "title": "Stopped",
        "plain": "The median seed cannot complete germination here. Either it is too cold, too hot, or the soil is holding water too tightly. Some seeds in the tail of the bell curve may still make it.",
        "physics": "The driving force is zero or negative, so the dose never reaches θ_HTT. Waiting longer does not help unless you change temperature or water.",
    },
]

WATER_SCALE: list[dict] = [
    {"psi_mpa": 0.0, "label": "Free water", "garden": "A film of water on the seed, as in a wet paper towel."},
    {"psi_mpa": -0.03, "label": "Field capacity", "garden": "A pot that was watered and then drained. This is 'moist', not wet-soggy."},
    {"psi_mpa": -0.3, "label": "Drying", "garden": "The top of the pot is dry to the touch. Germination slows."},
    {"psi_mpa": -1.5, "label": "Wilting range", "garden": "Many leaves would wilt here. Most of these seeds will not finish germination."},
]
