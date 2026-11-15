-- Gỡ chức năng Thay nhân vật video (V1, V2): thu hẹp CHECK pipeline (CHECK không khai báo được trong Prisma schema).
-- Các Task thuộc hai pipeline này phải được xóa trước khi chạy migration; ADD CONSTRAINT sẽ lỗi nếu còn dòng vi phạm.
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_pipeline_valid_chk";
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_pipeline_valid_chk" CHECK ("pipeline" IN ('face_swap', 'body_retouch', 'motion_control', 'outfit_change'));
