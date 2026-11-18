# Bảng giá chốt cuối

Cập nhật: 2026-11-18. Tài liệu phân tích đầy đủ nằm ở `bao-cao-gia-credit-2026-11-18.md`. File này chỉ ghi **quyết định**. Chưa sửa code.

## Giả định dùng chung

- Tỷ giá 25.700 đ/USD. Máy tiêu chuẩn $0,88/giờ, Plus $1,18/giờ.
- **Đã chốt:** gói Creator 28.000 credit (199.000đ, 7,11 đ/credit), credit tặng FREE giữ 250. Starter 9,80 đ/credit, Pro 8,25 đ/credit.
- Biên gộp tính theo giá vốn GPU, chưa tính Task lỗi (vẫn tốn GPU, hoàn credit), phí lưu trữ và credit tặng.

## 1. Đã chốt: Motion Control v1

**Giá = 150 credit + 20 credit/giây. Thời lượng tối thiểu 5 giây. Gói FREE tạo được clip 5 giây.**

Giá vốn suy từ 3 điểm đo máy tiêu chuẩn: 3 giây (4:29, $0,066), 9 giây (5:08, $0,076), 15 giây (6:40, $0,098), tức khoảng 1.440đ cố định + 69đ/giây.

| Clip | Credit | Giá vốn | Starter | Pro | Creator | Biên S / P / C |
|---|---|---|---|---|---|---|
| 5 giây | 250 | 1.782đ | 2.450đ | 2.062đ | 1.777đ | 27% / 14% / 0% |
| 7 giây | 290 | 1.920đ | 2.842đ | 2.392đ | 2.061đ | 32% / 20% / 7% |
| 10 giây | 350 | 2.125đ | 3.430đ | 2.888đ | 2.488đ | 38% / 26% / 15% |
| 15 giây | 450 | 2.468đ | 4.410đ | 3.712đ | 3.198đ | 44% / 34% / 23% |
| 20 giây | 550 | 2.812đ | 5.390đ | 4.538đ | 3.909đ | 48% / 38% / 28% |

Rủi ro đã chấp nhận:
- Creator hòa vốn ở clip 5 giây. Tỷ lệ Task lỗi 10% đẩy Creator xuống −11% ở 5 giây và 5% ở 10 giây.
- FREE có 250 credit, đúng bằng một clip 5 giây: mỗi tài khoản mới tốn khoảng 1.780đ GPU không có doanh thu.
- Giá vốn chỉ có 3 điểm đo (sai số 50 đến 100đ); điểm 5, 7, 10, 20 giây là suy ra. Theo dõi biên thực trong thống kê admin 2 đến 4 tuần đầu. Nếu biên Creator 5 giây âm, nâng phần cố định lên 200.

## 2. Đã chốt: Motion Control v2

**Giá = 150 credit + 65 credit/giây. Thời lượng tối thiểu 5 giây (dùng chung `MOTION_MIN_TRIM_SECONDS`), tối đa 10 giây (giữ `MOTION_MAX_SECONDS.motion_control_v2`).**

Giá vốn suy từ 3 điểm đo máy Plus ($1,18/giờ): 3 giây (4:04), 10 giây (10:30), 15 giây (15:24), tức khoảng 601đ cố định + 477đ/giây video. Chưa có số tiền $ thật từ RunningHub, và không có điểm đo ở clip 5 giây.

| Clip | Credit | Giá vốn | Starter | Pro | Creator | Biên S / P / C |
|---|---|---|---|---|---|---|
| 5 giây | 475 | 2.986đ | 4.655đ | 3.919đ | 3.376đ | 36% / 24% / 12% |
| 7 giây | 605 | 3.940đ | 5.929đ | 4.991đ | 4.300đ | 34% / 21% / 8% |
| 10 giây | 800 | 5.371đ | 7.840đ | 6.600đ | 5.686đ | 31% / 19% / 6% |

Rủi ro đã chấp nhận:
- Đơn giá 65 credit/giây thấp hơn ngưỡng hòa vốn của Creator (khoảng 67 credit/giây), nên biên Creator **giảm dần khi clip dài** (12% → 6%). Phần cố định 150 credit là thứ giữ biên dương. Không được nâng cap v2 lên trên 10 giây khi chưa tính lại.
- Tỷ lệ Task lỗi 10% đẩy Creator xuống 2% (5 giây), −2% (7 giây), −5% (10 giây). Giá vốn cao hơn dự tính 10% thì Creator chỉ còn 3% (5 giây) và âm ở clip 7 đến 10 giây.
- Gói FREE không dùng được v2 (clip 5 giây tối thiểu 475 credit, FREE chỉ có 250). Đây là chủ ý.
- Cách giảm rủi ro nếu biên thực quá mỏng: nâng phần cố định lên 200 (200 + 65: Creator 20% / 14% / 11%) hoặc giới hạn v2 ở 7 đến 8 giây.

## 3. Đã chốt: tính năng ảnh

**Face Swap, Body Retouch, Đổi Trang Phục giữ nguyên 100 credit/Task** (không đổi so với hiện tại, không cần sửa code giá ảnh).

Giá vốn từ Excel (máy tiêu chuẩn $0,88/giờ, 25.700đ/USD), doanh thu mỗi Task: Starter 980đ, Pro 825đ, Creator 711đ.

| Chức năng | Số mẫu | Giá vốn TB / max | Biên S / P / C (vốn TB) | Biên Creator (vốn max) |
|---|---|---|---|---|
| Face Swap | 12 | 300đ / 433đ | 69% / 64% / 58% | 39% |
| Body Retouch | 4 | 368đ / 477đ | 62% / 55% / 48% | 33% |
| Đổi Trang Phục | 3 | 266đ / 320đ | 73% / 68% / 63% | 55% |

Ghi chú:
- Body Retouch và Đổi Trang Phục chỉ có 4 và 3 mẫu đo, nên biên là ước tính. Body Retouch có biên thấp nhất; nếu biên thực dưới 35% thì cân nhắc nâng lên 110 đến 120 credit.
- Lỗi 15% vẫn giữ biên Creator trên 39% ở cả ba chức năng.
- Chưa so với giá thị trường của chức năng ảnh.
- Gói FREE (250 credit) làm được 2 Task ảnh, tốn khoảng 530đ đến 735đ GPU mỗi tài khoản mới.

## 4. Chưa chốt

| Mục | Tình trạng |
|---|---|
| `motion_background` | **Đang ẩn, chưa phân tích giá** (chưa có số đo chi phí). Bỏ khỏi phạm vi đợt này |
| Đổi Người Trong Ảnh AI | **Đang ẩn, chưa phân tích giá.** Bỏ khỏi phạm vi đợt này; giữ nguyên hành vi cũ khi sửa code |

## 5. Việc cần sửa khi áp dụng (làm sau)

| Nơi | Thay đổi |
|---|---|
| `packages/contracts/src/tasks.ts` | `MOTION_MIN_TRIM_SECONDS` 3 → 5; `motionPrice()` đang hardcode `50 * giây` → nhận pipeline: v1 = 150 + 20 × giây, v2 = 150 + 65 × giây |
| `packages/contracts/src/wallet.ts` | Bỏ `z.literal(50)` và `motionControlMinSeconds: z.literal(3)`; `maxVideoSeconds` đang `z.union([3, 20])` → thêm 5 |
| `apps/api/src/modules/wallet/tier.ts` | FREE `maxVideoSeconds` 3 → 5; `motionControlMinSeconds` → 5; thêm phí cố định và đơn giá/giây; Creator `credits` 30.000 → 28.000 ở cả `tiers` và `topupPacks` (đã chốt); FREE `credits` giữ 250 |
| `apps/api/src/modules/tasks/tasks.service.ts` | Giá Motion theo từng pipeline |
| `apps/api/src/modules/admin-stats/admin-stats.service.ts` | Biên Motion phải tính theo doanh thu thực của Task, vì giá có phần cố định |
| FE | `useMotionControl.ts`, `VideoTrimmer.vue`, `utils/catalog.ts`, `pages/pricing.vue` (câu "tối đa 3 giây" của FREE) |
| Test | `motion-control.test.mjs`, `smoke-motion-control.test.mjs` (`motionPrice(10) === 500`), `tier.test.mjs`, test web (giá 3 giây, `maxVideoSeconds` FREE) |

Lưu ý: `motionPrice()` và `MOTION_MIN_TRIM_SECONDS` dùng chung cho `motion_control`, `motion_control_v2` và `motion_background`. Phải tách giá theo pipeline. `motion_background` đang ẩn và chưa có giá: khi sửa code chỉ cần giữ nguyên hành vi cũ cho pipeline này (không để nó vô tình dùng giá v1 hoặc v2), và phân tích giá riêng trước khi bật lại.
