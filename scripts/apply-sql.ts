import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";

/**
 * prisma/sql/<domain>/*.sql を、ファイル名の辞書順に全て実行する。
 * Prismaのマイグレーションはテーブル/カラム/enumだけを管理し、
 * PostgreSQL Functions・RLSポリシー・triggerはここで別管理する
 * （理由は docs/アーキテクチャ.md 参照）。
 *
 * 各ファイルは `CREATE OR REPLACE FUNCTION` / `DROP POLICY IF EXISTS` +
 * `CREATE POLICY` のように、再実行しても壊れない書き方にすること。
 */
// common（is_group_member 等の共通ヘルパー）は他ドメインのRLS/RPCから
// 参照されるため、辞書順に関わらず必ず最初に適用する。
const PRIORITY_DOMAINS = ["common"];

async function main() {
  const sqlRoot = join(process.cwd(), "prisma", "sql");
  const allDomains = (await readdir(sqlRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const domains = [
    ...PRIORITY_DOMAINS.filter((d) => allDomains.includes(d)),
    ...allDomains.filter((d) => !PRIORITY_DOMAINS.includes(d)),
  ];

  for (const domain of domains) {
    const domainDir = join(sqlRoot, domain);
    const files = (await readdir(domainDir))
      .filter((name) => name.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const sql = await readFile(join(domainDir, file), "utf-8");
      if (!sql.trim()) continue;
      console.log(`applying ${domain}/${file}`);
      await prisma.$executeRawUnsafe(sql);
    }
  }

  console.log("done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
