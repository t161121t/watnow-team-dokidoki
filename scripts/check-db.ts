import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✔ Database connection OK");
  } catch (err) {
    console.error("✘ Database connection failed");
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
