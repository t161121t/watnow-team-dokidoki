-- AddColumn (nullable first: 既存行がある前提のバックフィル付き追加)
ALTER TABLE "secrets" ADD COLUMN "title" TEXT;

-- Backfill: title導入前の既存秘密は、それまで一覧・オークション会場等の
-- 見出しとして使われていたsummaryをそのままtitleとして引き継ぐ
-- （2026-08-23、ユーザー報告: タイトルとカテゴリは別物、概要は本来
-- ディーラー限定にすべき、という指摘を受けてtitleを新設）。
UPDATE "secrets" SET "title" = "summary" WHERE "title" IS NULL;

-- 以後は必須
ALTER TABLE "secrets" ALTER COLUMN "title" SET NOT NULL;
