import { isPlaceholderTeam } from "~/lib/fifa-sync";

// FIFA 3-letter codes sourced from play.fifa.com/json/chip_challenge/squads.json
// with added aliases for alternate spellings that appear in fixture data
const FIFA_CODES: Record<string, string> = {
  algeria: "ALG",
  argentina: "ARG",
  australia: "AUS",
  austria: "AUT",
  belgium: "BEL",
  "bosnia and herzegovina": "BIH",
  brazil: "BRA",
  "cabo verde": "CPV",
  "cape verde": "CPV",
  canada: "CAN",
  colombia: "COL",
  "congo dr": "COD",
  "côte d'ivoire": "CIV",
  "cote d'ivoire": "CIV",
  "ivory coast": "CIV",
  croatia: "CRO",
  curaçao: "CUW",
  curacao: "CUW",
  czechia: "CZE",
  "czech republic": "CZE",
  ecuador: "ECU",
  egypt: "EGY",
  england: "ENG",
  france: "FRA",
  germany: "GER",
  ghana: "GHA",
  haiti: "HAI",
  "ir iran": "IRN",
  iran: "IRN",
  iraq: "IRQ",
  japan: "JPN",
  jordan: "JOR",
  "korea republic": "KOR",
  "south korea": "KOR",
  mexico: "MEX",
  morocco: "MAR",
  netherlands: "NED",
  "new zealand": "NZL",
  norway: "NOR",
  panama: "PAN",
  paraguay: "PAR",
  portugal: "POR",
  qatar: "QAT",
  "saudi arabia": "KSA",
  scotland: "SCO",
  senegal: "SEN",
  "south africa": "RSA",
  spain: "ESP",
  sweden: "SWE",
  switzerland: "SUI",
  tunisia: "TUN",
  türkiye: "TUR",
  turkiye: "TUR",
  turkey: "TUR",
  uruguay: "URU",
  usa: "USA",
  "united states": "USA",
  uzbekistan: "UZB",
};

const FIFA_FLAG_BASE = "https://api.fifa.com/api/v3/picture/flags-sq-1";

export function isKnownCountry(countryName: string): boolean {
  return countryName.trim().toLowerCase() in FIFA_CODES;
}

/** FIFA's 3-letter country code (matches `IdCountry` from the FIFA API), or null if unrecognized. */
export function getFifaCountryCode(countryName: string): string | null {
  return FIFA_CODES[countryName.trim().toLowerCase()] ?? null;
}

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
