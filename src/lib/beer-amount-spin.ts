export const BEER_AMOUNT_OPTIONS = [500, 1000, 2000, 3000, 5000] as const;
export type BeerAmount = (typeof BEER_AMOUNT_OPTIONS)[number];

/** Spin odds, positionally aligned with BEER_AMOUNT_OPTIONS — must sum to 100. */
const BEER_AMOUNT_WEIGHT_VALUES = [8, 70, 15, 5, 2] as const;

const TOTAL_WEIGHT = BEER_AMOUNT_WEIGHT_VALUES.reduce(
  (sum, weight) => sum + weight,
  0,
);

export const BEER_AMOUNT_WEIGHTS = new Map<BeerAmount, number>(
  BEER_AMOUNT_OPTIONS.map((amount, i) => [amount, BEER_AMOUNT_WEIGHT_VALUES[i]!]),
);

export function pickRandomBeerAmount(
  random: () => number = Math.random,
): BeerAmount {
  let remaining = random() * TOTAL_WEIGHT;
  for (const amount of BEER_AMOUNT_OPTIONS) {
    remaining -= BEER_AMOUNT_WEIGHTS.get(amount)!;
    if (remaining < 0) return amount;
  }
  return BEER_AMOUNT_OPTIONS[BEER_AMOUNT_OPTIONS.length - 1]!;
}

/**
 * Angular width (degrees) of `amount`'s wedge on the wheel — proportional to
 * its odds, so a 70%-weighted amount gets a much wider slice than a 2% one.
 */
export function segmentAngle(amount: BeerAmount): number {
  return (BEER_AMOUNT_WEIGHTS.get(amount)! / TOTAL_WEIGHT) * 360;
}

/** Angle (degrees, clockwise from the top) where `amount`'s wedge starts. */
export function segmentStartAngle(amount: BeerAmount): number {
  const index = BEER_AMOUNT_OPTIONS.indexOf(amount);
  const weightBefore = BEER_AMOUNT_WEIGHT_VALUES.slice(0, index).reduce(
    (sum, weight) => sum + weight,
    0,
  );
  return (weightBefore / TOTAL_WEIGHT) * 360;
}

/** Angle (degrees, clockwise from the top) of the middle of `amount`'s wedge. */
export function segmentMidAngle(amount: BeerAmount): number {
  return segmentStartAngle(amount) + segmentAngle(amount) / 2;
}

const WHEEL_FULL_SPINS = 5;

/**
 * Target CSS rotation (degrees) that brings `amount`'s wedge under the
 * fixed pointer at the top, after a few extra full spins for visual effect.
 */
export function rotationForAmount(
  amount: BeerAmount,
  random: () => number = Math.random,
): number {
  const midAngle = segmentMidAngle(amount);
  const jitter = (random() - 0.5) * (segmentAngle(amount) * 0.4);
  return WHEEL_FULL_SPINS * 360 + (360 - midAngle) + jitter;
}

/**
 * Display formatting for a beer-amount value — rounds first so callers
 * don't have to remember to round a float (e.g. an average) before
 * formatting, then applies thousands separators.
 */
export function formatBeerAmount(amount: number): string {
  return Math.round(amount).toLocaleString();
}

export interface BeerPoolAmountResult {
  spinnerCount: number;
  averageAmount: number | null;
  finalAmount: number | null;
}

/**
 * totalBeers × average(amount) over users who've spun. Non-spinners are
 * excluded from the denominator entirely, not treated as 0.
 */
export function computeBeerPoolAmount(
  totalBeers: number,
  spunAmounts: number[],
): BeerPoolAmountResult {
  const spinnerCount = spunAmounts.length;
  if (spinnerCount === 0) {
    return { spinnerCount: 0, averageAmount: null, finalAmount: null };
  }
  const averageAmount =
    spunAmounts.reduce((sum, amount) => sum + amount, 0) / spinnerCount;
  return {
    spinnerCount,
    averageAmount,
    finalAmount: totalBeers * averageAmount,
  };
}

