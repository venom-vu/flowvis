-- Đổi trang phục: cho phép pipeline outfit_change (CHECK không khai báo được trong Prisma schema).
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_pipeline_valid_chk";
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_pipeline_valid_chk" CHECK ("pipeline" IN ('face_swap', 'body_retouch', 'motion_control', 'character_replace', 'outfit_change'));
