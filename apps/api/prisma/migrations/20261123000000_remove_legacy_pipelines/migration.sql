-- Gỡ 3 chức năng person_replace, motion_background, multi_angle_product: xóa Task cũ cùng bút toán sổ cái,
-- tính lại balance/held của user bị ảnh hưởng, rồi siết CHECK pipeline (CHECK không khai báo được trong Prisma schema).
-- share_tokens tự xóa theo ON DELETE CASCADE của task_id.
CREATE TEMP TABLE "_legacy_tasks" AS
SELECT "id", "user_id" FROM "tasks"
WHERE "pipeline" IN ('person_replace', 'motion_background', 'multi_angle_product');

DELETE FROM "ledger_entries" WHERE "task_id" IN (SELECT "id" FROM "_legacy_tasks");
DELETE FROM "tasks" WHERE "id" IN (SELECT "id" FROM "_legacy_tasks");

-- balance = SUM(amount); held = tổng HOLD chưa có CAPTURED/RELEASED.
UPDATE "users" u SET
  "balance" = COALESCE((SELECT SUM(l."amount") FROM "ledger_entries" l WHERE l."user_id" = u."id"), 0),
  "held" = COALESCE((
    SELECT -SUM(h."amount") FROM "ledger_entries" h
    WHERE h."user_id" = u."id" AND h."type" = 'HOLD'
      AND NOT EXISTS (
        SELECT 1 FROM "ledger_entries" s
        WHERE s."task_id" = h."task_id" AND s."type" IN ('CAPTURED', 'RELEASED')
      )
  ), 0)
WHERE u."id" IN (SELECT "user_id" FROM "_legacy_tasks");

ALTER TABLE "tasks" DROP CONSTRAINT "tasks_pipeline_valid_chk";
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_pipeline_valid_chk" CHECK ("pipeline" IN ('face_swap', 'body_retouch', 'motion_control', 'outfit_change', 'motion_control_v2', 'veo3', 'muse_video'));

DROP TABLE "_legacy_tasks";
