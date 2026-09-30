-- CreateTable
CREATE TABLE IF NOT EXISTS "eod_enablements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "enabled_by_id" TEXT NOT NULL,
    "enabled_by_name" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eod_enablements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "eod_enablements_date_idx" ON "eod_enablements"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "eod_enablements_enabled_by_id_idx" ON "eod_enablements"("enabled_by_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "eod_enablements_user_id_date_key" ON "eod_enablements"("user_id", "date");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'eod_enablements_user_id_fkey'
  ) THEN
    ALTER TABLE "eod_enablements"
      ADD CONSTRAINT "eod_enablements_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'eod_enablements_enabled_by_id_fkey'
  ) THEN
    ALTER TABLE "eod_enablements"
      ADD CONSTRAINT "eod_enablements_enabled_by_id_fkey"
      FOREIGN KEY ("enabled_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
