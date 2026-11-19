---
title: 'Muse Video: tạo video AI từ ảnh tham chiếu (RunningHub muse-video/economy)'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: '3c8671efb5f3545307366c04d180fa8230199dbb'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/muse-api-integartion/image-to-video.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** flowvis chưa có model Meta Muse Video, dù RunningHub đã mở API model chuẩn `POST /openapi/v2/meta/muse-video/economy`. Model này tạo video 720p dài khoảng 10 giây, có âm thanh, từ prompt và ảnh tham chiếu.

**Approach:** Tích hợp như một pipeline mới `muse_video` theo đúng khuôn của Veo 3 (commit `3c8671e`): `runMode: 'model'`, upload ảnh qua `uploadMedia`, gửi JSON phẳng qua `submitModel`, rồi nhập kết quả video lên R2. Phía web có card `muse-video` ("Muse Video") trong kho công cụ, form trong `FeatureWorkspaceDialog` và trang riêng `/muse-video`.

**Quyết định đã chốt (người dùng, 2026-11-19):**
- Giá **200 credit** mỗi video, cố định.
- **Chỉ image-to-video**: bắt buộc ít nhất 1 ảnh, không có tab text-to-video.
- **1–9 ảnh tham chiếu.** Khóa không được trùng nhau. Tổng `sizeBytes` của các ảnh không vượt **11 MB** (11 × 1024 × 1024 byte); server kiểm tra trước khi HOLD.
- **Tỉ lệ khung**: 7 giá trị `16:9, 9:16, 1:1, 4:3, 3:4, 3:2, 2:3` cùng "Theo ảnh" (mặc định), tức không gửi `aspectRatio`.

## Boundaries & Constraints

**Always:**
- Server quyết định giá; HOLD/RELEASED theo AD-2 và AD-3; chuyển trạng thái qua compare-and-set.
- Gửi cố định `duration: "10"`, `resolution: "720p"` và `nsfwCheck: false`. Lưu `params.seconds = 10`.
- Prompt dài 1–4000 ký tự sau khi trim. Hằng số đặt trong `packages/contracts`.
- Video kết quả lưu lên R2 (`ingestVideo`), không dùng link 24 giờ của RunningHub.
- Mọi lỗi sau HOLD đều thành `failed` và RELEASED 100%.
- Chỉ module `storage` đọc bảng `uploads` (AD-1). Tổng dung lượng ảnh lấy qua method public mới của `UploadsService`.

**Never:**
- Không đổi hành vi của Veo 3 hay các pipeline khác.
- Không gửi Base64.
- Không cho người dùng chọn duration hoặc resolution.
- Không dùng emoji trong UI.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ảnh → video | prompt hợp lệ, 1–9 ảnh của user, tổng ≤ 11 MB, đủ credit | 201, `price = creditCost = 200`, task `queued`; worker upload từng ảnh rồi gửi `imageUrls` theo đúng thứ tự người dùng chọn | N/A |
| Theo ảnh | không có `aspectRatio` | payload không chứa `aspectRatio` | N/A |
| Prompt sai | `prompt` rỗng hoặc dài hơn 4000 ký tự | 400 `VALIDATION_FAILED` | Không HOLD |
| Số ảnh sai | 0 ảnh, hơn 9 ảnh hoặc khóa trùng | 400 `VALIDATION_FAILED` | Không HOLD |
| Quá dung lượng | tổng `sizeBytes` > 11 MB | 400 `VALIDATION_FAILED`, kèm thông báo tiếng Việt nêu giới hạn 11 MB | Không HOLD |
| Ảnh không thuộc user | khóa của người khác hoặc chưa confirm | 400 `VALIDATION_FAILED` | Không HOLD |
| Không đủ credit | balance < 200 | lỗi theo luồng ví hiện có | Không tạo task |
| params hỏng | `buildRequest` trả về null (vd. không có URL ảnh) | task `failed` `INTERNAL_ERROR` | RELEASED |

</frozen-after-approval>

## Code Map

- `docs/muse-api-integartion/image-to-video.md`: hợp đồng API. Kết quả poll qua `/openapi/v2/query`, adapter đã có sẵn.
- `packages/contracts/src/tasks.ts`: thêm `'muse_video'` vào cuối `TASK_PIPELINES`. Thêm hằng số `MUSE_VIDEO_*` (prompt 1/4000, `MUSE_VIDEO_MAX_IMAGES = 9`, `MUSE_VIDEO_MAX_TOTAL_BYTES`, `MUSE_VIDEO_DURATION_SECONDS = 10`, `MUSE_VIDEO_PRICE = 200`, `MUSE_VIDEO_ASPECT_RATIOS`). Thêm `MuseVideoCreateRequestSchema` (`.strict()`, gồm `prompt`, `imageKeys: ConfirmedUploadKeySchema[]` 1–9 phần tử không trùng, `aspectRatio?`) và `MuseVideoCreateResponseSchema` (`price === creditCost`). Mẫu: `Veo3*` quanh dòng 360.
- `packages/contracts/src/wallet.ts` + `mocks.ts` + `apps/api/src/modules/wallet/tier.ts`: thêm `museVideoCredits: z.literal(200)` cùng giá trị trong `DEFAULT_PRICING_CONFIG` và `PRICING_CONFIG`.
- `apps/api/prisma/migrations/20261121000000_tasks_pipeline_muse_video/migration.sql`: sửa `tasks_pipeline_valid_chk` để thêm `'muse_video'`, theo mẫu `20261120000000_tasks_pipeline_veo3`.
- `apps/api/src/modules/storage/uploads.service.ts`: thêm `getConfirmedImagesTotalBytes(userId, keys): Promise<number | null>`. Trả về null nếu có khóa không thuộc user, chưa confirm hoặc đã hết hạn; dùng cùng điều kiện `where` với `areConfirmedKeysOwnedBy`.
- `apps/api/src/modules/pipelines/muse-video.ts` (mới): `MUSE_VIDEO_DEFAULT_MODEL = 'meta/muse-video/economy'`, `museVideoInputKeys` (các khóa `imageKey0..8` có trong inputKeys, theo thứ tự số), `buildMuseVideoRequest` (path `/openapi/v2/${model}`, giữ dấu `/` của model, không encode cả chuỗi). Mẫu: `veo3.ts`.
- `apps/api/src/modules/pipelines/pipeline-config.ts`: thêm entry `muse_video` (`RUNNINGHUB_MUSE_VIDEO_MODEL`, `RUNNINGHUB_INSTANCE_MUSE_VIDEO`, `runMode: 'model'`, `deadlineMs: 600_000`).
- `apps/api/src/modules/tasks/tasks.controller.ts`: thêm `POST /tasks/muse-video`, theo mẫu `createVeo3`.
- `apps/api/src/modules/tasks/tasks.service.ts`: thêm `createMuseVideo`. Đặt `inputKeys = { imageKey0: …, … }`, gọi `getConfirmedImagesTotalBytes` (null → `VALIDATION_FAILED`; > 11 MB → `VALIDATION_FAILED` kèm message riêng), rồi gọi `createPipelineTask` với `keysVerified: true`. Thêm vào `INPUT_DISPLAY_ORDER` và union `pipeline`.
- `apps/api/src/modules/tasks/result-ingestor.ts`: thêm `muse_video` vào nhánh `ingestVideo`.
- `apps/api/src/modules/admin-stats/admin-stats.service.ts`: giá cố định nên nhánh `else` đọc unitCredits; kiểm tra xem nhánh này có cần map `muse_video` sang `museVideoCredits` không.
- `apps/api/.env.example` + `apps/api/test/instance-pricing.test.mjs`: thêm `RUNNINGHUB_MUSE_VIDEO_MODEL` và `RUNNINGHUB_INSTANCE_MUSE_VIDEO`.
- Web, mỗi file theo phần Veo 3 tương ứng:
  - `utils/api-client.ts`: `createMuseVideoTask` và re-export.
  - `composables/useMuseVideo.ts`.
  - `components/MuseVideoForm.vue`: tối đa 9 `ImageUploader`, thêm ô kế tiếp khi ô trước đã có ảnh, xóa được từng ảnh; chọn tỉ lệ (mặc định "Theo ảnh"); textarea prompt có đếm ký tự.
  - `pages/muse-video.vue`.
  - `utils/catalog.ts`: id `muse-video`, `per_run`, `unitCredits: museVideoCredits`.
  - `FeatureWorkspaceDialog.vue`, `TaskHistoryRow.vue`, `TaskProgressCard.vue`, `TaskResultViewer.vue`, `pages/tasks/[id].vue` (nhãn `imageKey0..8` → "Ảnh tham chiếu N").
  - `utils/task-format.ts`, `utils/seo-routes.ts`, `content/seo-tools.ts`.
- Tests: thêm mock `useMuseVideo` và `MuseVideoForm.vue` vào `apps/web/test/{body-retouch,motion-control}.test.mjs`; cập nhật số lượng catalog trong `smoke.test.mjs`; cập nhật `packages/contracts/test/index.test.mjs` (`TASK_PIPELINES`, giá).

## Tasks & Acceptance

**Execution:**
- [x] `packages/contracts/src/{tasks,wallet,mocks}.ts` + `test/index.test.mjs`: thêm schema, hằng số và giá.
- [x] `apps/api/prisma/migrations/20261121000000_tasks_pipeline_muse_video/migration.sql`: mở rộng CHECK.
- [x] `apps/api/src/modules/storage/uploads.service.ts`: thêm `getConfirmedImagesTotalBytes`.
- [x] `apps/api/src/modules/pipelines/{muse-video,pipeline-config}.ts`: dựng request model.
- [x] `apps/api/src/modules/tasks/{tasks.controller,tasks.service,result-ingestor}.ts`, `wallet/tier.ts`, `admin-stats.service.ts`, `.env.example`: thêm endpoint tạo task, kiểm tra dung lượng, nhập kết quả video.
- [x] `apps/api/test/muse-video.test.mjs`: test `buildMuseVideoRequest`, `museVideoInputKeys` và schema contract theo I/O matrix, theo mẫu `veo3.test.mjs`.
- [ ] Các file web trong Code Map: card, dialog, trang riêng, nhận diện pipeline video, nhãn tiếng Việt.
- [x] `apps/web/public/banner/muse-video.jpg`: copy từ `veo-3.jpg` làm ảnh tạm.

**Acceptance Criteria:**
- Given người dùng đã đăng nhập và đủ credit, when mở card Muse Video, tải 1–9 ảnh, nhập prompt rồi bấm tạo, then task `muse_video` bị trừ 200 credit, hiển thị tiến trình, và khi xong có video phát được từ R2.
- Given form chưa có ảnh hoặc prompt rỗng, when xem nút tạo, then nút bị vô hiệu hóa.
- Given task `muse_video` đã hoàn tất, when mở `/tasks/:id` hoặc lịch sử, then thấy poster/video, nhãn pipeline "Muse Video" và các ảnh tham chiếu theo thứ tự.

## Implementation Notes

## Spec Change Log

## Review Triage Log

Vòng 1 (3 lớp: blind-hunter, edge-case-hunter, verification-gap).

| # | Nguồn | Phát hiện | Verdict | Bằng chứng / Route |
|---|-------|-----------|---------|--------------------|
| 1 | blind, edge ×3 | Vẫn bấm tạo được khi một ô ảnh đang tải lên hoặc lỗi. `selectedKeys` bỏ qua ô null nên video thiếu ảnh. | medium | `ImageUploader.handleFileSelect` phát `change {key:null}` khi bắt đầu tải, còn `canSubmit` chỉ cần ≥1 khóa. **patch**: ImageUploader phát `busy`, form chặn khi có ô đang bận hoặc ô null không nằm cuối. |
| 2 | blind | 11 MB chỉ kiểm tra sau khi tải lên; không báo dung lượng còn lại trước khi chọn ảnh. | low | Có thật nhưng sửa phải thêm nhánh và tham số; bộ đếm cùng lỗi phía server đã chặn. **reject** |
| 3 | blind, edge | `clearState` đặt `[null]` khi độ dài vẫn là 1 nên `slotBytes` giữ giá trị cũ. | false | `clearState` gán `totalBytes = 0`; lần `change` sau ghi đè `slotBytes[0]`; ImageUploader tự hủy qua watcher `modelValue` khi nhận null. |
| 4 | blind | Ô trống cuối có nút xóa; xóa xong nó tự thêm lại và remount. | low | Sửa trực tiếp điều kiện `v-if`, vẫn giữ nút xóa cho ô lỗi ở giữa. **patch** |
| 5 | blind | Doanh thu `muse_video` trong admin-stats lấy giá hiện tại, không lấy credit thực thu. | low | Nhánh `veo3` liền trên dùng `ok_credits_costed`; nếu đổi giá thì doanh thu quá khứ bị tính sai. **patch**: dùng cùng biểu thức. |
| 6 | blind | Giá khai báo ở 3 nơi. | low | Cùng mẫu với Veo 3; `wallet.ts` có `z.literal` buộc `tier.ts` khớp, còn test buộc `MUSE_VIDEO_PRICE` khớp. **reject** |
| 7 | blind | `nsfwCheck: false`; lỗi kiểm duyệt có thể không ánh xạ sang `CONTENT_BLOCKED`. | maybe-false | Spec cố định `nsfwCheck: false`. Việc ánh xạ errorCode của adapter có sẵn, dùng chung với Veo 3; cần mã lỗi thật từ RunningHub để kết luận. **defer** (medium, chưa kiểm chứng) |
| 8 | blind, vg | Comment trong contracts nói "dung lượng gốc" nhưng code cộng `sizeBytes` sau khi resize. | low | `uploads.service.ts` lưu `sizeBytes` sau resize. Chỉ cần sửa comment. **patch** |
| 9 | blind | Thông báo lỗi khi ảnh hết hạn hoặc không thuộc user chung chung quá. | low | Sửa phải thêm nhánh; trùng hành vi với các pipeline khác. **reject** |
| 10 | blind | `:disabled` thừa điều kiện `intakePaused`. | low | Vô hại. **reject** |
| 11 | blind, vg | Mệnh đề where kiểm tra sở hữu bị chép ở 2 chỗ. | low | Hai chỗ đang khớp nhau; test DB (mục 15) sẽ phát hiện nếu lệch. **reject** |
| 12 | blind | Regex `imageKey(\d)` và format khóa viết inline ở nhiều chỗ. | low | Tối đa 9 ảnh nên chỉ một chữ số. **reject** |
| 13 | edge | Biến env model có `/` thừa sinh path `//`. | low | Sửa trực tiếp bằng `filter(Boolean)`. **patch** |
| 14 | edge | Test veo3 nới lỏng: pipeline `runMode:'model'` thiếu builder vẫn pass. | low | Chỉ cần thêm một assert. **patch** |
| 15 | vg | Không test DB thật cho `getConfirmedImagesTotalBytes`. | high | Đây là cổng kiểm tra sở hữu duy nhất của pipeline này (`keysVerified: true`). **patch**: thêm test vào `uploads.test.mjs`. |
| 16 | vg | Migration CHECK không được test với `muse_video`. | medium | Test pipeline hiện có chỉ kiểm tra `motion_control`. **patch** |
| 17 | vg | Chưa test việc đưa `muse_video` vào `ingestVideo`. | medium | **patch**: thêm case vào `motion-result.test.mjs`. |
| 18 | vg | Không có assert `params.seconds = 10`. | medium | Thiếu giá trị này thì `tasks.service.ts:628` ném lỗi khi đọc kết quả. **patch** |
| 19 | vg | Nhánh margin `muse_video` trong admin-stats chưa được test. | low | **patch**: thêm test cùng mục 5. |
| 20 | vg | Phần frontend Muse Video không có test chạy thật. | medium | Repo cũng chưa có test này cho Veo 3. **defer** |
| 21 | vg | `/tasks/muse-video` không nằm trong danh sách kiểm tra intake-paused. | low | Lỗ hổng có từ trước, `/tasks/veo3` cũng thiếu. **reject** |

## Design Notes

Ảnh lưu theo khóa có số thứ tự để giữ thứ tự gửi đi, vì worker tải input theo `Record`. Payload mẫu:

```ts
{ path: '/openapi/v2/meta/muse-video/economy',
  payload: { prompt, imageUrls: [url(imageKey0), url(imageKey1)],
             ...(aspectRatio ? { aspectRatio } : {}),
             duration: '10', resolution: '720p', nsfwCheck: false } }
```

Thiếu URL cho bất kỳ khóa nào trong `museVideoInputKeys` thì trả về null, tức không gửi request thiếu ảnh.

## Verification

**Commands:**
- `pnpm run typecheck`: kỳ vọng pass.
- `pnpm run lint`: kỳ vọng pass.
- `pnpm test`: kỳ vọng pass, gồm cả `muse-video.test.mjs`.
- `pnpm run build`: kỳ vọng pass.
