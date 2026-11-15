---
title: 'Video Automatic Character Replacement (FE + BE)'
type: 'feature'
created: '2026-11-12'
status: 'done'
route: 'dispatch'
baseline_commit: '1d33f4336148867b013664fd206c3010eaffc5cd'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Kho AI chưa có tính năng thay nhân vật trong video: người dùng muốn tải video gốc, ảnh nhân vật tham chiếu và mô tả hành vi, rồi nhận video đã thay nhân vật.

**Approach:** Thêm pipeline thứ 4 `character_replace`, nhân bản luồng Motion Control (tải video, cắt ffmpeg, HOLD credit, worker submit RunningHub AI App `1955095782514987010`, nhập kết quả video lên R2), cộng card và dialog trên FE.

## Boundaries & Constraints

**Always:**
- Giá = `motionPrice(seconds)` (50 credit × số giây sau cắt), do server tính; FE chỉ hiển thị. Cap độ dài theo `maxVideoSeconds` của Tier Snapshot, tối thiểu `MOTION_MIN_TRIM_SECONDS`.
- Backend cắt video bằng `videoTrim.prepare` (params `trimStart`, `seconds`). Nodes gửi RunningHub: 352 `video`, 318 `image`, 284 `text` (prompt, bắt buộc, tối đa 300 ký tự, không tự dịch), 339 `int` = `seconds` (chuỗi), 341 `int` = cố định `"0"` vì video đã cắt.
- Env: `RUNNINGHUB_WORKFLOW_CHARACTER_REPLACE` (id AI App, ví dụ `1955095782514987010`), `RUNNINGHUB_MODE_CHARACTER_REPLACE` (mặc định `ai-app`); không đặt `requiredAtStartup`, để không làm hỏng môi trường chưa cấu hình. Thiếu cấu hình thì tạo task vẫn hợp lệ nhưng adapter `unconfigured` ném `RH_ERROR` và RELEASED 100%.
- Mọi lỗi sau HOLD là `failed` và RELEASED 100%; `PREP_TIMEOUT` là `timed_out`. Kết quả video lưu R2, ảnh bìa, chia sẻ như Motion Control.
- **KHÔNG BAO GIỜ gọi RunningHub thật khi chạy test hoặc smoke**: test chạy `NODE_ENV=test`, không đặt `RUNNINGHUB_API_KEY`, dùng `startFakeRunningHub` hoặc adapter `unconfigured`. Không có lệnh nào của tôi (build, test, thử tay) gọi `runninghub.ai`.

**Never:** Sửa hành vi Face Swap/Body Retouch/Motion Control; thêm `ApiErrorCode` mới; thêm nhánh Prisma enum; đổi giá Motion Control; tự dịch prompt; lưu link CDN RunningHub.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | key ảnh + video đã xác nhận, trim 5s, prompt hợp lệ, đủ credit | 201 task `queued`, `price`=250, HOLD 250, worker gửi 5 node đúng nodeId | N/A |
| TRIM_SHORT | trim < 3s | 400 VALIDATION_FAILED `TRIM_TOO_SHORT`, không HOLD | N/A |
| OVER_CAP | trim > cap Tier | 400 `TRIM_EXCEEDS_CAP`, rollback HOLD | N/A |
| PROMPT_INVALID | prompt rỗng hoặc > 300 ký tự | 400 VALIDATION_FAILED | N/A |
| KEY_FOREIGN | key không thuộc user hoặc trùng nhau | 400 VALIDATION_FAILED | N/A |
| NO_CREDIT | số dư < giá | 402 INSUFFICIENT_CREDIT | N/A |
| RH_FAIL | fake RunningHub trả FAILED | task `failed`, RELEASED 100% | reasonCode qua `mapRunningHubFailure` |

</frozen-after-approval>

## Code Map

- `packages/contracts/src/tasks.ts` -- thêm `'character_replace'` vào `TASK_PIPELINES`; schema `CharacterReplaceCreateRequestSchema`/`ResponseSchema` (mẫu `MotionCreateRequestSchema`, `prompt` bắt buộc 1–300, không `aspectRatio`); bổ sung thông báo lỗi nếu cần.
- `packages/contracts/src/wallet.ts` -- `PipelinePricingSchema` thêm `characterReplaceCreditsPerSecond` (literal 50) và `characterReplaceMinSeconds`; `mocks.ts` + `test/index.test.mjs` cập nhật theo.
- `apps/api/prisma/migrations/<mốc sau 20261111020000>_tasks_pipeline_character_replace/migration.sql` -- DROP/ADD CHECK `tasks_pipeline_valid_chk` với đủ 4 giá trị (mẫu `20261110000000_tasks_pipeline_motion_control`).
- `apps/api/src/modules/pipelines/pipeline-config.ts` -- cấu hình `character_replace` (inputs 318/352, params 284/339, fixedNodes 341=`0`, `deadlineMs` 360000, `prepare: videoTrim.prepare`).
- `apps/api/src/modules/tasks/tasks.controller.ts` + `tasks.service.ts` -- `POST /tasks/character-replace`, `createCharacterReplace` (mẫu `createMotionControl`), mở rộng union trong `createPipelineTask`.
- `apps/api/src/modules/tasks/result-ingestor.ts` (:~160) -- nhánh video cho `character_replace`; `admin-stats.service.ts` (:102) và `wallet/tier.ts` nếu có phân nhánh theo pipeline.
- `apps/api/.env.example`, `deploy/.env.example`, `deploy/compose.yml`, `deploy/compose.smoke.yml` -- thêm hai biến env.
- `apps/web/utils/catalog.ts` -- `FeaturePipelineId` thêm `character-replace`, thêm card (billingMode `per_second`); `utils/api-client.ts` -- `createCharacterReplaceTask`.
- `apps/web/composables/useCharacterReplace.ts` (mẫu `useMotionControl.ts`), `components/FeatureWorkspaceDialog.vue` (nhánh mới), `utils/task-format.ts`, `TaskProgressCard.vue`, `TaskHistoryRow.vue`, `pages/tasks/[id].vue` -- hiển thị theo pipeline mới.

## Tasks & Acceptance

**Execution:**
- [x] `packages/contracts/src/tasks.ts`, `wallet.ts`, `mocks.ts`, `test/index.test.mjs` -- thêm pipeline, schema, giá -- hợp đồng dùng chung.
- [x] Migration SQL mới -- mở rộng CHECK pipeline.
- [x] `pipeline-config.ts`, `tasks.service.ts`, `tasks.controller.ts`, `result-ingestor.ts`, `admin-stats.service.ts`, `.env.example` x2, `deploy/*` -- BE đầy đủ.
- [x] `apps/api/test/character-replace.test.mjs` -- giá, trim, prompt, HOLD/RELEASED, nodeInfoList gửi fake (`state.submitBodies`), ingest kết quả; toàn bộ dùng fake, không mạng ra ngoài.
- [x] `apps/web/*` như Code Map + `apps/web/test/character-replace.test.mjs` -- card, dialog, giá thời gian thực, gửi đúng body.

**Acceptance Criteria:**
- Given fake RunningHub, when tạo task 5 giây, then `submitBodies` chứa đúng 5 nodeId (352, 318, 284, 339="5", 341="0").
- Given `RUNNINGHUB_API_KEY` không đặt, when chạy toàn bộ test, then không có kết nối tới `runninghub.ai`.
- Given trang chủ, when mở card mới, then `FeatureWorkspaceDialog` hiển thị tải video và thanh trim, tải ảnh nhân vật, ô prompt, giá = 50 × số giây.
- `pnpm run lint`, `typecheck`, `build`, `test` đều pass; Motion Control không thay đổi hành vi.

## Implementation Notes

- Pipeline `character_replace` nhân bản luồng Motion Control; nodeId 352/318/284/339/341 lấy nguyên từ curl mẫu của người dùng, node 341 cố định `"0"` vì video đã cắt bằng ffmpeg.
- Test API và web chỉ dùng fake/stub, không đặt `RUNNINGHUB_API_KEY`, không gọi `runninghub.ai`.
- Test fail có từ trước (đã xác nhận trên baseline `1d33f43`): 3 test web (`motion-control`, `smoke` Header popover) và 2 test API `motion-result` ("params thiếu seconds", "quá deadline_at").
- Chưa kiểm thủ công dialog ở 360px và desktop; chỉ có test logic/SSR.
- Build web cần `NUXT_PUBLIC_REPORT_EMAIL`; test API cần `DATABASE_URL` khớp DB cục bộ.

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| `resetReplaceState()` gọi hai lần (Dialog:145-146) | low | patch | Đọc code: hai dòng liên tiếp, remount hai lần |
| `characterReplaceMinSeconds` bắt buộc, comment nói tùy chọn (wallet.ts:391) | medium | patch | Khác `motionControlMinSeconds` là `.optional()`, backend cũ parse lỗi |
| Ingestor thật chưa được test với `character_replace` | medium | patch | Test stub `worker.ingestor`; đổi dòng 160 vẫn pass |
| Margin admin của `character_replace` chưa có test | medium | patch | Chỉ test đếm pipeline 3 thành 4 |
| Thiếu test env workflow thiếu thành RH_ERROR + RELEASED 100% | medium | patch | Spec cam kết hành vi này |
| Chưa assert thông báo NO_POSE/NO_FACE override | low | patch | Một dòng assert cạnh test contracts |
| Dialog chỉ test bằng so khớp chuỗi nguồn | low | patch | Thêm test logic/SSR nếu khuôn cho phép |
| `300` viết cứng, testid `workspace-insufficient-note` trùng | low | patch | Sửa nhỏ cùng Dialog |
| Prompt lỗi trả `issues[0].message` không có `details.reason` | false | rejected | Message schema là tiếng Việt, FE hiển thị message; giống Motion |
| Service kiểm tra lặp prompt/trim sau Zod | low | rejected | Phòng thủ chiều sâu như `createMotionControl` |
| `isMotion` đặt tên gây hiểu nhầm; dùng giá Motion | low | rejected | Cùng giá 50/giây theo spec; chỉ là tên biến |
| `hasEnoughBalance` true khi số dư chưa tải | low | rejected | Giống `useMotionControl`, server vẫn trả 402 |
| `getPipelineRoute` trả `/` cho `character_replace` | low | rejected | Cố ý: spec không có trang riêng |
| Submit đang bay khi đóng dialog gán task cũ | maybe-false | defer | Cần thử thủ công; đã ghi deferred-work.md |
| Thiếu env workflow vẫn 201 + HOLD rồi fail RH_ERROR | false | rejected | Spec chấp nhận, RELEASED 100% |
| fieldName/nodeId có thể sai | false | rejected | Lấy nguyên từ curl mẫu của người dùng |
| Composable lặp `useMotionControl`, check video lặp nhiều nơi | low | rejected | Refactor lớn, chưa có hại cụ thể |
| Migration không `IF EXISTS`/NOT VALID | low | rejected | Cùng mẫu migration Motion đã dùng |
| Spec còn task chưa tick, Implementation Notes trống | false | rejected | Việc của bước này |
| Dùng `startFakeRunningHub` thay stub `worker.rh` | low | rejected | AC chấp nhận fake; `calls.nodes` đã kiểm 5 node |

## Verification

**Commands:**
- `pnpm run lint && pnpm run typecheck && pnpm run build` -- expected: pass
- `pnpm test` -- expected: pass, cần Postgres/Redis như các test API hiện có; không gọi RunningHub thật

**Manual checks (if no CLI):**
- Mở `/`, card "Thay Nhân Vật Video" hiện ra, dialog mở trên mobile 360px và desktop; đúng giá theo giây.
