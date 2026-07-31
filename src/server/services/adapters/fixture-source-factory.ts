import { FifaWorldCupAdapter } from "./fifa-world-cup-adapter";
import { type FixtureSourceAdapter } from "./types";

/**
 * Selects a FixtureSourceAdapter by `Tournament.dataSourceKey` — a small
 * switch, not a plugin system. Extend with a new case when a second data
 * source is actually needed, per this repo's "don't build for hypothetical
 * scale" principle.
 */
export function createFixtureSourceAdapter(
  dataSourceKey: string,
): FixtureSourceAdapter {
  switch (dataSourceKey) {
    case "fifa-world-cup":
      return new FifaWorldCupAdapter();
    default:
      throw new Error(`Unknown fixture data source key: ${dataSourceKey}`);
  }
}
