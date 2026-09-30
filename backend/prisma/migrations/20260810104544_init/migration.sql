-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "manager_id" TEXT,
    "manager_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_updates" (
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

    CONSTRAINT "work_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_attachments" (
    "id" TEXT NOT NULL,
    "work_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "file_type" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edit_history" (
    "id" TEXT NOT NULL,
    "work_id" TEXT NOT NULL,
    "edited_by" TEXT NOT NULL,
    "edited_by_name" TEXT NOT NULL,
    "changes" JSONB NOT NULL DEFAULT '[]',
    "edited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "edit_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_manager_id_idx" ON "users"("manager_id");

-- CreateIndex
CREATE INDEX "users_department_idx" ON "users"("department");

-- CreateIndex
CREATE INDEX "work_updates_user_id_idx" ON "work_updates"("user_id");

-- CreateIndex
CREATE INDEX "work_updates_status_idx" ON "work_updates"("status");

-- CreateIndex
CREATE INDEX "work_updates_department_idx" ON "work_updates"("department");

-- CreateIndex
CREATE INDEX "work_updates_category_idx" ON "work_updates"("category");

-- CreateIndex
CREATE INDEX "work_updates_created_at_idx" ON "work_updates"("created_at");

-- CreateIndex
CREATE INDEX "work_updates_reviewer_id_idx" ON "work_updates"("reviewer_id");

-- CreateIndex
CREATE INDEX "work_attachments_work_id_idx" ON "work_attachments"("work_id");

-- CreateIndex
CREATE INDEX "edit_history_work_id_idx" ON "edit_history"("work_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_updates" ADD CONSTRAINT "work_updates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_updates" ADD CONSTRAINT "work_updates_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_attachments" ADD CONSTRAINT "work_attachments_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "work_updates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edit_history" ADD CONSTRAINT "edit_history_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "work_updates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edit_history" ADD CONSTRAINT "edit_history_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
