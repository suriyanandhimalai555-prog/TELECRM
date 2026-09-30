-- Add the state associated with each user. Nullable keeps existing accounts valid.
ALTER TABLE "users" ADD COLUMN "state" TEXT;
