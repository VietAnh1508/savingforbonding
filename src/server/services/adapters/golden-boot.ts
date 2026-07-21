import { type NormalizedAwardCandidate } from "./types";

/**
 * FIFA's Golden Boot tiebreak: most goals, then most assists, then fewest
 * minutes played. Players level on all three share the award — this is the
 * award's own rule, not specific to any one data source.
 */
export function isTiedForGoldenBoot(
  a: NormalizedAwardCandidate,
  b: NormalizedAwardCandidate,
): boolean {
  return (
    a.goals === b.goals &&
    a.assists === b.assists &&
    a.minutesPlayed === b.minutesPlayed
  );
}
