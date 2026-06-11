import {
  buildScheduleMatchKey,
  normalizeTeamForScheduleMatch,
} from "~/lib/kqbd-teams";

export const KQBD_VIETNAM_UTC_OFFSET_HOURS = 7;

export const KQBD_WORLD_CUP_URL = "https://kqbd.mobi/keo-bong-da/world-cup";

export type KqbdFixture = {
  kickoffAt: Date;
  homeCountry: string;
  awayCountry: string;
};

const TABLE_BLOCK_REGEX =
  /<div class="table-bet-main">[\s\S]*?<span class="day-bet-time">(\d{2}\/\d{2})<\/span>\s*<span class="hour-bet-time">(\d{2}:\d{2})<\/span>[\s\S]*?<div class="column-match-box">\s*<div class="name-clb-(?:green|black)">([^<]+)<\/div>\s*<div class="name-clb-(?:green|black)">([^<]+)<\/div>/g;

/** Parse KQBD Vietnam wall-clock kickoff (dd/MM HH:mm) into UTC. */
export function parseKqbdKickoffToUtc(
  dayMonth: string,
  hourMinute: string,
  seasonYear = 2026,
): Date {
  const [dayRaw, monthRaw] = dayMonth.split("/");
  const [hourRaw, minuteRaw] = hourMinute.split(":");
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (
    [day, month, hour, minute].some((value) => Number.isNaN(value)) ||
    monthRaw === undefined ||
    minuteRaw === undefined
  ) {
    throw new Error(`Invalid KQBD kickoff: ${dayMonth} ${hourMinute}`);
  }

  return new Date(
    Date.UTC(
      seasonYear,
      month - 1,
      day,
      hour - KQBD_VIETNAM_UTC_OFFSET_HOURS,
      minute,
    ),
  );
}

export function parseKqbdWorldCupHtml(
  html: string,
  seasonYear = 2026,
): KqbdFixture[] {
  const fixtures: KqbdFixture[] = [];

  for (const match of html.matchAll(TABLE_BLOCK_REGEX)) {
    const dayMonth = match[1];
    const hourMinute = match[2];
    const homeCountry = match[3]?.trim();
    const awayCountry = match[4]?.trim();

    if (!dayMonth || !hourMinute || !homeCountry || !awayCountry) {
      continue;
    }

    fixtures.push({
      kickoffAt: parseKqbdKickoffToUtc(dayMonth, hourMinute, seasonYear),
      homeCountry: normalizeTeamForScheduleMatch(homeCountry),
      awayCountry: normalizeTeamForScheduleMatch(awayCountry),
    });
  }

  return fixtures;
}

export function buildKqbdKickoffLookup(
  fixtures: KqbdFixture[],
): Map<string, Date> {
  const lookup = new Map<string, Date>();

  for (const fixture of fixtures) {
    lookup.set(
      buildScheduleMatchKey(fixture.homeCountry, fixture.awayCountry),
      fixture.kickoffAt,
    );
  }

  return lookup;
}

export async function fetchKqbdWorldCupSchedule(
  seasonYear = 2026,
): Promise<KqbdFixture[]> {
  const response = await fetch(KQBD_WORLD_CUP_URL, {
    headers: {
      Accept: "text/html",
      "User-Agent": "SavingForBonding/1.0",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(
      `KQBD schedule error: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();
  return parseKqbdWorldCupHtml(html, seasonYear);
}

export function lookupKqbdKickoff(
  homeCountry: string,
  awayCountry: string,
  lookup: Map<string, Date>,
): Date | null {
  return lookup.get(buildScheduleMatchKey(homeCountry, awayCountry)) ?? null;
}
