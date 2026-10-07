import { describe, expect, it } from "vitest";
import { layoutCallouts } from "./callouts";

describe("layoutCallouts", () => {
  it("keeps labels at least one gap apart even when anchors coincide", () => {
    const placed = layoutCallouts(
      [
        { key: "a", text: "Seed coat", x: 100, y: 200 },
        { key: "b", text: "Radicle", x: 102, y: 201 },
        { key: "c", text: "Root hairs", x: 101, y: 203 },
      ],
      22,
    );
    const ys = placed.map((p) => p.ly);
    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(22 - 1e-9);
    expect(ys[2] - ys[1]).toBeGreaterThanOrEqual(22 - 1e-9);
    expect(placed.every((p) => p.lx === 102 + 64)).toBe(true);
  });

  it("leaves well-spaced labels at their anchors", () => {
    const placed = layoutCallouts([
      { key: "top", text: "Cotyledons", x: 0, y: 0 },
      { key: "bottom", text: "Radicle", x: 0, y: 300 },
    ]);
    expect(placed[0].ly).toBeCloseTo(0);
    expect(placed[1].ly).toBeCloseTo(300);
  });

  it("orders labels by height", () => {
    const placed = layoutCallouts([
      { key: "low", text: "low", x: 0, y: 400 },
      { key: "high", text: "high", x: 0, y: 10 },
    ]);
    expect(placed.map((p) => p.key)).toEqual(["high", "low"]);
  });
});
