/** Normalize team labels from KQBD or FIFA into a shared matching key. */
const TEAM_ALIASES: Record<string, string> = {
  "nam phi": "South Africa",
  "hàn quốc": "Korea Republic",
  "sec": "Czechia",
  "séc": "Czechia",
  "mỹ": "USA",
  "thụy sĩ": "Switzerland",
  "marốc": "Morocco",
  "thổ nhĩ kỳ": "Türkiye",
  "đức": "Germany",
  "hà lan": "Netherlands",
  "nhật bản": "Japan",
  "bờ biển ngà": "Côte d'Ivoire",
  "thụy điển": "Sweden",
  "tuynidi": "Tunisia",
  "tây ban nha": "Spain",
  "bỉ": "Belgium",
  "ai cập": "Egypt",
  "ả rập xê-út": "Saudi Arabia",
  "pháp": "France",
  "na uy": "Norway",
  "angiêri": "Algeria",
  "áo": "Austria",
  "bồ đào nha": "Portugal",
  "anh": "England",
  "ch congo": "Congo DR",
  "dr congo": "Congo DR",
  "congo dr": "Congo DR",
  "bosnia-herzegovina": "Bosnia and Herzegovina",
  "bosnia and herzegovina": "Bosnia and Herzegovina",
  "cape verde": "Cabo Verde",
  "cabo verde": "Cabo Verde",
  curacao: "Curaçao",
  "côte d'ivoire": "Côte d'Ivoire",
  "cote d'ivoire": "Côte d'Ivoire",
  "ivory coast": "Côte d'Ivoire",
  "korea republic": "Korea Republic",
  "south korea": "Korea Republic",
  "united states": "USA",
  turkiye: "Türkiye",
  turkey: "Türkiye",
  czechia: "Czechia",
  "czech republic": "Czechia",
};

function normalizeKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function normalizeTeamForScheduleMatch(name: string): string {
  const key = normalizeKey(name);
  return TEAM_ALIASES[key] ?? name.trim();
}

export function buildScheduleMatchKey(home: string, away: string): string {
  return `${normalizeTeamForScheduleMatch(home)}|${normalizeTeamForScheduleMatch(away)}`;
}
