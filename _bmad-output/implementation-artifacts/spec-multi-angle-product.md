---
title: 'Tạo sản phẩm đa góc (RunningHub AI app 2030848699949125633)'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_commit: '682c299c94bb8a2837f7e0d1863cb2f25bfe9fc0'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** flowxis chưa có tính năng tạo ảnh sản phẩm đa góc, dù RunningHub đã có AI app `2030848699949125633`. App nhận 3 ảnh: node `27`, `28`, `7`, cùng field `image`.

**Approach:** Thêm pipeline `multi_angle_product` theo khuôn ai-app của `person_replace`. Adapter hiện có đã gửi `instanceType` và `usePersonalQueue: 'false'`, nên không cần adapter mới. Kết quả là **một ảnh**: đi qua nhánh ảnh sẵn có của `result-ingestor` (EXIF, R2). Phía web thêm card `multi-angle-product` ("Tạo sản phẩm đa góc") với form 3 ô ảnh trong `FeatureWorkspaceDialog`, cùng trang riêng `/multi-angle-product`.

**Quyết định đã chốt (người dùng, 2026-11-20):**
- Giá **200 credit** mỗi lần chạy, cố định.
- Ba ô ảnh có nhãn "Ảnh sản phẩm 1/2/3", tương ứng node 27, 28, 7. Bắt buộc đủ 3 ảnh.
- Tách spec. Phần này chỉ lưu **một** ảnh kết quả (adapter lấy URL media đầu tiên). Hỗ trợ nhiều ảnh kết quả để sang `deferred-work.md`.

## Boundaries & Constraints

**Always:**
- Server quyết định giá. HOLD/RELEASED theo AD-2 và AD-3. Chuyển trạng thái qua compare-and-set.
- 3 khóa ảnh phải đã confirm, thuộc user và không trùng nhau. Sai thì trả 400 `VALIDATION_FAILED` và không HOLD.
- Kết quả lưu trên R2, kèm EXIF `Software: AI Generator`. Mọi lỗi sau HOLD thành `failed` và RELEASED 100%.
- Biến môi trường: `RUNNINGHUB_WORKFLOW_MULTI_ANGLE_PRODUCT` (mặc định `2030848699949125633`) và `RUNNINGHUB_INSTANCE_MULTI_ANGLE_PRODUCT` (mặc định `default`).

**Never:**
- Không đổi hành vi của các pipeline khác, adapter hay luồng kết quả.
- Không dùng emoji trong UI.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Tạo task | 3 khóa hợp lệ, đủ 200 credit | 201, `creditCost = 200`, task `queued`. `nodeInfoList` = node 27/28/7 theo ảnh 1/2/3 | N/A |
| Thiếu hoặc trùng ảnh | < 3 khóa hoặc khóa trùng | 400 `VALIDATION_FAILED` | Không HOLD |
| Ảnh không thuộc user | khóa của người khác hoặc chưa confirm | 400 `VALIDATION_FAILED` | Không HOLD |
| Không đủ credit | balance < 200 | lỗi theo luồng ví hiện có | Không tạo task |
| RunningHub lỗi | job FAILED hoặc quá hạn | `failed`/`timed_out` | RELEASED |

</frozen-after-approval>

## Code Map

- `packages/contracts/src/tasks.ts`:
  - Thêm `'multi_angle_product'` vào cuối `TASK_PIPELINES` (:40).
  - Thêm `MULTI_ANGLE_PRODUCT_PRICE = 200`.
  - Thêm `MultiAngleProductCreateRequestSchema` (`.strict()`, `productKey1..3: ConfirmedUploadKeySchema`) và Response. Mẫu: PersonReplace (:255-263).
- Giá:
  - `packages/contracts/src/wallet.ts` (:392-411): `multiAngleProductCredits: z.literal(200)`.
  - `mocks.ts` (:66-69) và `apps/api/src/modules/wallet/tier.ts` (:15-29).
  - `apps/api/src/modules/admin-stats/admin-stats.service.ts` (:141-146): dùng `ok_credits_costed` giống veo3 và muse_video.
- `apps/api/prisma/migrations/20261122000000_tasks_pipeline_multi_angle_product/migration.sql`: mở rộng CHECK `tasks_pipeline_valid_chk`. Mẫu: `20261121000000_tasks_pipeline_muse_video`.
- `apps/api/src/modules/pipelines/pipeline-config.ts`: thêm entry `multi_angle_product`, `runMode: 'ai-app'`. Inputs: `productKey1→27`, `productKey2→28`, `productKey3→7` (`fieldName: 'image'`). Mẫu: `person_replace` (:91-104); không đặt `referenceInputKey`.
- `apps/api/src/modules/tasks/tasks.service.ts`:
  - Thêm `createMultiAngleProduct` theo mẫu `createPersonReplace` (:701-714), có kiểm tra trùng khóa.
  - Thêm vào `INPUT_DISPLAY_ORDER` (:111-121) và union `pipeline` của `createPipelineTask` (:880).
- `apps/api/src/modules/tasks/tasks.controller.ts` (:87-99): thêm `POST /tasks/multi-angle-product`.
- `apps/api/.env.example` và `apps/api/test/instance-pricing.test.mjs`: thêm biến môi trường mới.
- Không cần sửa `result-ingestor.ts`: pipeline ảnh mặc định đi nhánh ảnh. Danh sách video nằm ở :160.
- Web (mẫu: `pages/outfit-change.vue`, cùng các nhánh `outfit-change` và `person-replace` ở từng file):
  - `utils/api-client.ts`: `createMultiAngleProductTask` và schema imports.
  - `pages/multi-angle-product.vue`: 3 `ImageUploader` nhãn "Ảnh sản phẩm 1/2/3", cùng `TaskResultViewer`.
  - `utils/catalog.ts`: id `multi-angle-product`, `per_run`, `unitCredits: multiAngleProductCredits`.
  - `components/FeatureWorkspaceDialog.vue` (:391-411): form và nhánh submit.
  - `utils/task-format.ts`: nhãn pipeline.
  - `pages/tasks/[id].vue` (:146): route và nhãn `productKey1..3`.
  - `utils/seo-routes.ts`, `content/seo-tools.ts`.
  - `public/banner/multi-angle-product.png`: ảnh tạm.

## Tasks & Acceptance

**Execution:**
- [x] `packages/contracts/src/{tasks,wallet,mocks}.ts` + `test/index.test.mjs`: pipeline, schema, giá.
- [x] Migration CHECK, và cập nhật test pipeline CHECK nếu có liệt kê.
- [x] `pipeline-config.ts`, `tasks.service.ts`, `tasks.controller.ts`, `tier.ts`, `admin-stats.service.ts`, `.env.example`, `instance-pricing.test.mjs`.
- [x] `apps/api/test/multi-angle-product.test.mjs`: schema theo I/O matrix; config nối đúng node 27/28/7 theo thứ tự; giá 200.
- [x] Web: các file trong Code Map. Thêm mock vào `apps/web/test/{body-retouch,motion-control}.test.mjs` nếu cần, và cập nhật số lượng catalog trong `smoke.test.mjs`.

**Acceptance Criteria:**
- Given đã đăng nhập và đủ credit, when mở card "Tạo sản phẩm đa góc", tải 3 ảnh rồi bấm tạo, then bị trừ 200 credit, thấy tiến trình, và khi xong có ảnh kết quả lấy từ R2.
- Given form chưa đủ 3 ảnh, when xem nút tạo, then nút bị vô hiệu hóa.
- Given task đã xong, when mở `/tasks/:id` hoặc lịch sử, then thấy nhãn "Tạo sản phẩm đa góc" và 3 ảnh đầu vào có nhãn "Ảnh sản phẩm 1/2/3".

## Implementation Notes

- Thêm biến môi trường mới vào `deploy/compose.yml` (api, worker) và `deploy/.env.example` để bản deploy nhận được, ngoài Code Map.
- `public/banner/multi-angle-product.png` là ảnh tạm, cần thay ảnh thật.
- Kiểm chứng: typecheck và build pass. Test pass: contracts 57/57, boundaries 53/53, API không cần DB (gồm `multi-angle-product.test.mjs`), web 330/332. Hai test web fail có từ trước (`admin-ops` còn chữ "RunningHub", SSR smoke chờ "100 credit / lượt"). Web lint báo 2 lỗi ở `pages/index.vue`, file không có trong diff. Test API cần PostgreSQL (migration, `admin-stats`, `ops-breaker`) chưa chạy vì DB local từ chối user `motion_user` (P1000).

## Spec Change Log

## Review Triage Log

Vòng 1 (blind-hunter, edge-case-hunter, verification-gap).

| # | Nguồn | Phát hiện | Verdict | Bằng chứng / Route |
|---|-------|-----------|---------|--------------------|
| 1 | edge | `TaskProgressCard` hiện chữ "phân tích khuôn mặt" khi task đa góc đang chạy | medium | `TaskProgressCard.vue:315-318` chỉ phân biệt `body_retouch`. **patch** |
| 2 | blind | Lỗi trùng khóa trả 2 thông báo khác nhau (schema và service) | low | Sửa trực tiếp chuỗi message. **patch** |
| 3 | blind | Khối reset trong dialog thụt lề sai và lặp 4 dòng | low | Phần lặp có từ trước, nhưng sửa chỉ là xóa. **patch** |
| 4 | blind, vg | Chưa có test admin-stats cho `multi_angle_product` | medium | Bỏ điều kiện ở `admin-stats.service.ts:133` thì không test nào đỏ. **patch** |
| 5 | vg | Test `@CreatesTask` trong `ops-breaker` đã lỗi thời, regex bỏ sót route mới | medium | List cứng 6 handler, controller hiện có 10. **patch** |
| 6 | edge, blind | Dialog không gọi `markPaused` và không có `maintenance-note` như trang riêng | low | Nhánh outfit-change và person-replace trong dialog cũng thế: hành vi chung có từ trước. **reject** |
| 7 | edge | Trang riêng bật nút khi chưa biết số dư | false | Server vẫn kiểm tra số dư khi HOLD. `outfit-change.vue:42` dùng cùng mẫu `return true`. |
| 8 | edge | `api-client` ném ZodError nên hiện thông báo chung | low | Mọi hàm create đều `.parse` như vậy. UI đã chặn trùng vì mỗi lần upload sinh khóa mới. **reject** |
| 9 | blind | Cùng một ảnh tải lên 3 lần vẫn qua kiểm tra | low | Muốn chặn phải so hash, thêm độ phức tạp. Người dùng tự chọn ảnh. **reject** |
| 10 | blind | Chưa test ownership, no-HOLD và không đủ credit bằng DB thật | low | Logic nằm ở `createPipelineTask` dùng chung và đã có test DB qua các pipeline khác. Service không truyền `keysVerified` (đã assert). **reject** |
| 11 | blind | Mapping node chỉ được test trên config, chưa qua worker | low | Worker build `nodeInfoList` từ `cfg.inputs` bằng mã dùng chung đã có test. **reject** |
| 12 | blind | Không có test HTTP cho route | low | Đã gộp vào mục 5 (guard). Phần parse đã có test schema. **reject** |
| 13 | blind | Giá 200 khai báo ở nhiều nơi | low | Cùng mẫu với Muse Video. `z.literal` và test buộc các nơi khớp nhau. **reject** |
| 14 | blind | Ô ảnh không ghi rõ góc chụp | maybe-false | Nhãn "Ảnh sản phẩm 1/2/3" do người dùng chốt. Cần biết app có phân vai node hay không. **reject** (low) |
| 15 | blind | Mô tả "nhiều góc" trong khi chỉ lưu 1 ảnh | maybe-false | Phụ thuộc app trả ảnh ghép hay nhiều ảnh; đã ghi ở deferred multi-output. **reject** (low) |
| 16 | blind | Banner là ảnh tạm | low | Spec ghi rõ là ảnh tạm; sẽ báo người dùng. **reject** |
| 17 | blind | Link trang riêng là ternary dài, mặc định về `/face-swap` | low | Mẫu có từ trước; đã thêm nhánh. **reject** |
| 18 | blind | Web test chỉ tăng số lượng card | low | Các pipeline cùng loại cũng chưa có test web. **reject** |
| 19 | vg | Đường submit FE không có test thực thi | medium | Đã có từ trước với mọi pipeline; cần harness. **defer** |
| 20 | blind | `emit('submit')` mang `seconds` vô nghĩa | low | Cùng mẫu các nhánh ảnh khác; payload chỉ dùng để thông báo. **reject** |

## Verification

**Commands:**
- `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run build`: kỳ vọng pass.
