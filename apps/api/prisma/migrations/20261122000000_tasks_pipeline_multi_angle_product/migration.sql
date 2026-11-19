-- Tạo sản phẩm đa góc: cho phép pipeline multi_angle_product (CHECK không khai báo được trong Prisma schema).
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_pipeline_valid_chk";
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_pipeline_valid_chk" CHECK ("pipeline" IN ('face_swap', 'body_retouch', 'motion_control', 'outfit_change', 'person_replace', 'motion_control_v2', 'motion_background', 'veo3', 'muse_video', 'multi_angle_product'));
