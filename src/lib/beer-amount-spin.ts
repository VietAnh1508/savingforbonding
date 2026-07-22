export const BEER_AMOUNT_OPTIONS = [500, 1000, 2000, 3000, 5000] as const;
export type BeerAmount = (typeof BEER_AMOUNT_OPTIONS)[number];

export const WHEEL_SEGMENT_ANGLE = 360 / BEER_AMOUNT_OPTIONS.length;

export function pickRandomBeerAmount(
  random: () => number = Math.random,
): BeerAmount {
  const index = Math.min(
    Math.floor(random() * BEER_AMOUNT_OPTIONS.length),
    BEER_AMOUNT_OPTIONS.length - 1,
  );
  return BEER_AMOUNT_OPTIONS[index]!;
}

/** Angle (degrees, clockwise from the top) of the middle of `amount`'s wedge. */
export function segmentMidAngle(amount: BeerAmount): number {
  const index = BEER_AMOUNT_OPTIONS.indexOf(amount);
  return index * WHEEL_SEGMENT_ANGLE + WHEEL_SEGMENT_ANGLE / 2;
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
  const jitter = (random() - 0.5) * (WHEEL_SEGMENT_ANGLE * 0.4);
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

