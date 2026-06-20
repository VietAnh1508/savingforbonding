import bcrypt from "bcryptjs";
import { createPrismaClient } from "../src/server/create-prisma-client";

const db = createPrismaClient();

async function main() {
  const hash = await bcrypt.hash("changeme123", 12);
  await db.user.upsert({
    where: { email: "testuser@test.com" },
    update: { passwordHash: hash, mustChangePassword: true },
    create: {
      email: "testuser@test.com",
      name: "Test User",
      passwordHash: hash,
      mustChangePassword: true,
    },
  });
  console.log("testuser@test.com / changeme123 (mustChangePassword=true)");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
