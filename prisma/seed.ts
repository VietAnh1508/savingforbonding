import { PrismaClient } from "../generated/prisma";

const db = new PrismaClient();

const SAMPLE_MATCHES = [
  { home: "Brazil", away: "Argentina", daysFromNow: 1, homeRatio: 2.1, awayRatio: 0 },
  { home: "France", away: "Germany", daysFromNow: 1, homeRatio: 0, awayRatio: 1.9 },
  { home: "Spain", away: "Italy", daysFromNow: 3, homeRatio: 2.0, awayRatio: 0 },
  { home: "England", away: "Portugal", daysFromNow: 3, homeRatio: 0, awayRatio: 2.6 },
  { home: "Japan", away: "South Korea", daysFromNow: 5, homeRatio: 2.5, awayRatio: 0 },
  { home: "USA", away: "Mexico", daysFromNow: 7, homeRatio: 0, awayRatio: 2.3 },
];

async function main() {
  await db.vote.deleteMany();
  await db.match.deleteMany();

  for (const m of SAMPLE_MATCHES) {
    const kickoff = new Date();
    kickoff.setDate(kickoff.getDate() + m.daysFromNow);
    kickoff.setHours(20, 0, 0, 0);

    await db.match.create({
      data: {
        homeCountry: m.home,
        awayCountry: m.away,
        kickoffAt: kickoff,
        homeRatio: m.homeRatio,
        awayRatio: m.awayRatio,
        status: "SCHEDULED",
      },
    });
  }

  console.log(`Seeded ${SAMPLE_MATCHES.length} World Cup matches.`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
