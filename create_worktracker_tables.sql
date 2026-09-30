-- Creates all Work Tracker Enterprise tables in the shared CRM database,
-- prefixed with worktracker_ so nothing collides with existing CRM /
-- state_crm_* tables. Purely additive: only CREATE TABLE IF NOT EXISTS.

-- users
CREATE TABLE IF NOT EXISTS "worktracker_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "state" TEXT,
    "employee_id" TEXT,
    "mobile_number" TEXT,
    "manager_id" TEXT,
    "manager_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "worktracker_users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "worktracker_users_email_key" ON "worktracker_users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "worktracker_users_employee_id_key" ON "worktracker_users"("employee_id");
CREATE INDEX IF NOT EXISTS "worktracker_users_email_idx" ON "worktracker_users"("email");
CREATE INDEX IF NOT EXISTS "worktracker_users_manager_id_idx" ON "worktracker_users"("manager_id");
CREATE INDEX IF NOT EXISTS "worktracker_users_department_idx" ON "worktracker_users"("department");

-- work_updates
CREATE TABLE IF NOT EXISTS "worktracker_work_updates" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_role" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hours_spent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewer_id" TEXT,
    "reviewer_name" TEXT,
    "review_comment" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "worktracker_work_updates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "worktracker_work_updates_user_id_idx" ON "worktracker_work_updates"("user_id");
CREATE INDEX IF NOT EXISTS "worktracker_work_updates_status_idx" ON "worktracker_work_updates"("status");
CREATE INDEX IF NOT EXISTS "worktracker_work_updates_department_idx" ON "worktracker_work_updates"("department");
CREATE INDEX IF NOT EXISTS "worktracker_work_updates_category_idx" ON "worktracker_work_updates"("category");
CREATE INDEX IF NOT EXISTS "worktracker_work_updates_created_at_idx" ON "worktracker_work_updates"("created_at");
CREATE INDEX IF NOT EXISTS "worktracker_work_updates_reviewer_id_idx" ON "worktracker_work_updates"("reviewer_id");

-- work_attachments
CREATE TABLE IF NOT EXISTS "worktracker_work_attachments" (
    "id" TEXT NOT NULL,
    "work_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "file_type" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "worktracker_work_attachments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "worktracker_work_attachments_work_id_idx" ON "worktracker_work_attachments"("work_id");

-- edit_history
CREATE TABLE IF NOT EXISTS "worktracker_edit_history" (
    "id" TEXT NOT NULL,
    "work_id" TEXT NOT NULL,
    "edited_by" TEXT NOT NULL,
    "edited_by_name" TEXT NOT NULL,
    "changes" JSONB NOT NULL DEFAULT '[]',
    "edited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "worktracker_edit_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "worktracker_edit_history_work_id_idx" ON "worktracker_edit_history"("work_id");

-- employee_queries
CREATE TABLE IF NOT EXISTS "worktracker_employee_queries" (
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
    CONSTRAINT "worktracker_employee_queries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "worktracker_employee_queries_user_id_idx" ON "worktracker_employee_queries"("user_id");
CREATE INDEX IF NOT EXISTS "worktracker_employee_queries_status_idx" ON "worktracker_employee_queries"("status");
CREATE INDEX IF NOT EXISTS "worktracker_employee_queries_query_type_idx" ON "worktracker_employee_queries"("query_type");
CREATE INDEX IF NOT EXISTS "worktracker_employee_queries_created_at_idx" ON "worktracker_employee_queries"("created_at");

-- notifications
CREATE TABLE IF NOT EXISTS "worktracker_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link_tab" TEXT,
    "link_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "worktracker_notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "worktracker_notifications_user_id_is_read_idx" ON "worktracker_notifications"("user_id", "is_read");
CREATE INDEX IF NOT EXISTS "worktracker_notifications_created_at_idx" ON "worktracker_notifications"("created_at");

-- eod_records
CREATE TABLE IF NOT EXISTS "worktracker_eod_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "worktracker_eod_records_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "worktracker_eod_records_user_id_date_key" ON "worktracker_eod_records"("user_id", "date");
CREATE INDEX IF NOT EXISTS "worktracker_eod_records_date_idx" ON "worktracker_eod_records"("date");
CREATE INDEX IF NOT EXISTS "worktracker_eod_records_status_idx" ON "worktracker_eod_records"("status");

-- eod_enablements
CREATE TABLE IF NOT EXISTS "worktracker_eod_enablements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "enabled_by_id" TEXT NOT NULL,
    "enabled_by_name" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "worktracker_eod_enablements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "worktracker_eod_enablements_date_idx" ON "worktracker_eod_enablements"("date");
CREATE INDEX IF NOT EXISTS "worktracker_eod_enablements_enabled_by_id_idx" ON "worktracker_eod_enablements"("enabled_by_id");
CREATE UNIQUE INDEX IF NOT EXISTS "worktracker_eod_enablements_user_id_date_key" ON "worktracker_eod_enablements"("user_id", "date");

-- Foreign keys (guarded so this script is safe to re-run)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'worktracker_users_manager_id_fkey') THEN
    ALTER TABLE "worktracker_users" ADD CONSTRAINT "worktracker_users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "worktracker_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'worktracker_work_updates_user_id_fkey') THEN
    ALTER TABLE "worktracker_work_updates" ADD CONSTRAINT "worktracker_work_updates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "worktracker_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'worktracker_work_updates_reviewer_id_fkey') THEN
    ALTER TABLE "worktracker_work_updates" ADD CONSTRAINT "worktracker_work_updates_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "worktracker_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'worktracker_work_attachments_work_id_fkey') THEN
    ALTER TABLE "worktracker_work_attachments" ADD CONSTRAINT "worktracker_work_attachments_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "worktracker_work_updates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'worktracker_edit_history_work_id_fkey') THEN
    ALTER TABLE "worktracker_edit_history" ADD CONSTRAINT "worktracker_edit_history_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "worktracker_work_updates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'worktracker_edit_history_edited_by_fkey') THEN
    ALTER TABLE "worktracker_edit_history" ADD CONSTRAINT "worktracker_edit_history_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "worktracker_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'worktracker_employee_queries_user_id_fkey') THEN
    ALTER TABLE "worktracker_employee_queries" ADD CONSTRAINT "worktracker_employee_queries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "worktracker_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'worktracker_employee_queries_responded_by_fkey') THEN
    ALTER TABLE "worktracker_employee_queries" ADD CONSTRAINT "worktracker_employee_queries_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "worktracker_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'worktracker_notifications_user_id_fkey') THEN
    ALTER TABLE "worktracker_notifications" ADD CONSTRAINT "worktracker_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "worktracker_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'worktracker_eod_records_user_id_fkey') THEN
    ALTER TABLE "worktracker_eod_records" ADD CONSTRAINT "worktracker_eod_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "worktracker_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'worktracker_eod_enablements_user_id_fkey') THEN
    ALTER TABLE "worktracker_eod_enablements" ADD CONSTRAINT "worktracker_eod_enablements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "worktracker_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'worktracker_eod_enablements_enabled_by_id_fkey') THEN
    ALTER TABLE "worktracker_eod_enablements" ADD CONSTRAINT "worktracker_eod_enablements_enabled_by_id_fkey" FOREIGN KEY ("enabled_by_id") REFERENCES "worktracker_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
