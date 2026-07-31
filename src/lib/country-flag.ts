import { isPlaceholderTeam } from "~/lib/fifa-sync";
import {
  FIFA_FLAG_BASE,
  getFifaCountryCode,
} from "~/server/services/fifa/country-codes";

export function getFifaFlagUrl(countryName: string): string | null {
  if (isPlaceholderTeam(countryName)) return null;

  const code = getFifaCountryCode(countryName);
  if (!code) return null;

  return `${FIFA_FLAG_BASE}/${code}`;
}

/** Flag URL straight from a FIFA team/association code — no name lookup needed. */
export function getFlagUrlForCode(code: string): string {
  return `${FIFA_FLAG_BASE}/${code}`;
}
