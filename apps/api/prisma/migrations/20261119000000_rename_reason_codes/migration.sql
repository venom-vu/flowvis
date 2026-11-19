-- Đổi mã lý do RH_* sang mã trung tính để không lộ nhà cung cấp GPU.
UPDATE "tasks" SET "reason_code" = 'GPU_' || substr("reason_code", 4) WHERE "reason_code" LIKE 'RH\_%';
