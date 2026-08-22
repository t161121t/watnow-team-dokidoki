-- CreateTable
CREATE TABLE "group_invite_links" (
    "group_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_invite_links_pkey" PRIMARY KEY ("group_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_invite_links_code_key" ON "group_invite_links"("code");

-- AddForeignKey
ALTER TABLE "group_invite_links" ADD CONSTRAINT "group_invite_links_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_invite_links" ADD CONSTRAINT "group_invite_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
