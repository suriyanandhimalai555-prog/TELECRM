-- AlterTable
ALTER TABLE "users" ADD COLUMN "employee_id" TEXT;
ALTER TABLE "users" ADD COLUMN "mobile_number" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- CreateTable
CREATE TABLE "employee_queries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "query_type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "related_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "hr_response" TEXT,
    "responded_by" TEXT,
    "responded_by_name" TEXT,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link_tab" TEXT,
    "link_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eod_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eod_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_queries_user_id_idx" ON "employee_queries"("user_id");
CREATE INDEX "employee_queries_status_idx" ON "employee_queries"("status");
CREATE INDEX "employee_queries_query_type_idx" ON "employee_queries"("query_type");
CREATE INDEX "employee_queries_created_at_idx" ON "employee_queries"("created_at");
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");
CREATE UNIQUE INDEX "eod_records_user_id_date_key" ON "eod_records"("user_id", "date");
CREATE INDEX "eod_records_date_idx" ON "eod_records"("date");
CREATE INDEX "eod_records_status_idx" ON "eod_records"("status");

-- AddForeignKey
ALTER TABLE "employee_queries" ADD CONSTRAINT "employee_queries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_queries" ADD CONSTRAINT "employee_queries_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eod_records" ADD CONSTRAINT "eod_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
