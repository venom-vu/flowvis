-- Theo dõi chi phí GPU thật của RunningHub (USD, tài khoản Enterprise-Shared).
ALTER TABLE "tasks"
  ADD COLUMN "instance_type" TEXT,
  ADD COLUMN "cost_usd" NUMERIC(12,6),
  ADD COLUMN "cost_seconds" INTEGER,
  ADD COLUMN "cost_source" TEXT;

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_instance_type_check" CHECK ("instance_type" IS NULL OR "instance_type" IN ('default', 'plus', 'ultra')),
  ADD CONSTRAINT "tasks_cost_source_check" CHECK ("cost_source" IS NULL OR "cost_source" IN ('reported', 'estimated')),
  ADD CONSTRAINT "tasks_cost_usd_check" CHECK ("cost_usd" IS NULL OR "cost_usd" >= 0),
  ADD CONSTRAINT "tasks_cost_seconds_check" CHECK ("cost_seconds" IS NULL OR "cost_seconds" >= 0);
