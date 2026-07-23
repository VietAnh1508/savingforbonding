import { describe, expect, it } from "vitest";

import {
  BEER_AMOUNT_OPTIONS,
  BEER_AMOUNT_WEIGHTS,
  computeBeerPoolAmount,
  formatBeerAmount,
  pickRandomBeerAmount,
  rotationForAmount,
  segmentAngle,
  segmentMidAngle,
} from "~/lib/beer-amount-spin";

describe("pickRandomBeerAmount", () => {
  it("returns the first option when random() returns 0", () => {
    expect(pickRandomBeerAmount(() => 0)).toBe(BEER_AMOUNT_OPTIONS[0]);
  });

  it("returns the last option when random() returns just under 1", () => {
    expect(pickRandomBeerAmount(() => 0.999999)).toBe(
      BEER_AMOUNT_OPTIONS[BEER_AMOUNT_OPTIONS.length - 1],
    );
  });

  it("picks each option according to its cumulative weight boundary", () => {
    // Weights: 500:8, 1000:70, 2000:15, 3000:5, 5000:2 (cumulative: 8, 78, 93, 98, 100)
    expect(pickRandomBeerAmount(() => 0.07)).toBe(500);
    expect(pickRandomBeerAmount(() => 0.08)).toBe(1000);
    expect(pickRandomBeerAmount(() => 0.5)).toBe(1000);
    expect(pickRandomBeerAmount(() => 0.78)).toBe(2000);
    expect(pickRandomBeerAmount(() => 0.93)).toBe(3000);
    expect(pickRandomBeerAmount(() => 0.98)).toBe(5000);
  });

  it("only ever returns a member of BEER_AMOUNT_OPTIONS", () => {
    for (let i = 0; i < 100; i++) {
      expect(BEER_AMOUNT_OPTIONS).toContain(pickRandomBeerAmount());
    }
  });
});

describe("computeBeerPoolAmount", () => {
  it("returns nulls when no one has spun", () => {
    const result = computeBeerPoolAmount(1000, []);
    expect(result).toEqual({
      spinnerCount: 0,
      averageAmount: null,
      finalAmount: null,
    });
  });

  it("uses the single spinner's amount as the average", () => {
    const result = computeBeerPoolAmount(1000, [2000]);
    expect(result.spinnerCount).toBe(1);
    expect(result.averageAmount).toBe(2000);
    expect(result.finalAmount).toBe(1000 * 2000);
  });

  it("excludes non-spinners from the average rather than treating them as 0", () => {
    // 3 total users, only 1 has spun — average must equal that user's
    // amount, not be diluted by dividing over all 3 users.
    const result = computeBeerPoolAmount(300, [2000]);
    expect(result.spinnerCount).toBe(1);
    expect(result.averageAmount).toBe(2000);
  });

  it("computes a non-integer average across multiple spinners", () => {
    const result = computeBeerPoolAmount(10, [500, 1000, 1000]);
    expect(result.spinnerCount).toBe(3);
    expect(result.averageAmount).toBeCloseTo(2500 / 3);
    expect(result.finalAmount).toBeCloseTo(10 * (2500 / 3));
  });
});

describe("formatBeerAmount", () => {
  it("adds thousands separators to a plain integer", () => {
    expect(formatBeerAmount(5000)).toBe("5,000");
  });

  it("rounds a non-integer average before formatting", () => {
    expect(formatBeerAmount(2500 / 3)).toBe("833");
  });
});

describe("segmentAngle", () => {
  it("is proportional to each option's weight out of the total", () => {
    const totalWeight = BEER_AMOUNT_OPTIONS.reduce(
      (sum, amount) => sum + BEER_AMOUNT_WEIGHTS.get(amount)!,
      0,
    );
    BEER_AMOUNT_OPTIONS.forEach((amount) => {
      const weight = BEER_AMOUNT_WEIGHTS.get(amount)!;
      expect(segmentAngle(amount)).toBeCloseTo((weight / totalWeight) * 360);
    });
  });

  it("sums to a full circle across all options", () => {
    const total = BEER_AMOUNT_OPTIONS.reduce(
      (sum, amount) => sum + segmentAngle(amount),
      0,
    );
    expect(total).toBeCloseTo(360);
  });
});

describe("segmentMidAngle", () => {
  it("places each wedge's middle halfway through its own angle, back to back in wheel order", () => {
    let expectedStart = 0;
    for (const amount of BEER_AMOUNT_OPTIONS) {
      const angle = segmentAngle(amount);
      expect(segmentMidAngle(amount)).toBeCloseTo(expectedStart + angle / 2);
      expectedStart += angle;
    }
  });
});

describe("rotationForAmount", () => {
  it("brings the target amount's wedge under the top pointer (no jitter)", () => {
    const noJitter = () => 0.5; // (0.5 - 0.5) * anything === 0
    for (const amount of BEER_AMOUNT_OPTIONS) {
      const rotation = rotationForAmount(amount, noJitter);
      const finalAngle = rotation % 360;
      expect(finalAngle).toBeCloseTo((360 - segmentMidAngle(amount)) % 360);
    }
  });

  it("always includes multiple full spins for visual effect", () => {
    const rotation = rotationForAmount(BEER_AMOUNT_OPTIONS[0]!, () => 0.5);
    expect(rotation).toBeGreaterThanOrEqual(4 * 360);
  });

  it("keeps jitter within the segment (never crosses into a neighboring wedge)", () => {
    for (const amount of BEER_AMOUNT_OPTIONS) {
      for (const randomValue of [0, 1]) {
        const rotation = rotationForAmount(amount, () => randomValue);
        const finalAngle = rotation % 360;
        const jitter =
          finalAngle - ((360 - segmentMidAngle(amount)) % 360);
        // Tiny epsilon for floating-point rounding through the `%` above.
        expect(Math.abs(jitter)).toBeLessThanOrEqual(
          segmentAngle(amount) * 0.2 + 1e-9,
        );
      }
    }
  });
});
