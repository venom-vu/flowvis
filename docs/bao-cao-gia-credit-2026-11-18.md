# Báo cáo hiện trạng giá credit và đề xuất phương án mới

Ngày: 2026-11-18. Căn cứ: mã nguồn tại commit `c9f5f10` (nhánh `main`) và file `Phân tích giá .xlsx`. Không dùng PRD/kiến trúc cũ.

## 1. Phạm vi và giả định

- Đã đọc: `apps/api/src/modules/wallet/tier.ts`, `packages/contracts/src/{tasks,wallet}.ts`, `modules/tasks/*` (tạo Task, ghi chi phí), `modules/pipelines/pipeline-config.ts`, `modules/admin-stats/*`, `modules/auth/anti-abuse.ts`, `deploy/.env.example`.
- Chưa làm: chạy hệ thống, truy vấn DB thật, đọc mã FE chi tiết.
- Tỷ giá dùng **25.700 đ/USD** (theo yêu cầu). Hệ thống thật lấy tỷ giá từ API công khai (cache 1 giờ, dự phòng `USD_VND` = 25.000 trong `fx-rate.service.ts`), nên số trên màn admin có thể lệch nhẹ.
- Giá máy theo `instance-pricing.ts`: `default` $0,88/giờ, `plus` $1,18/giờ, `ultra` $2,35/giờ. Khớp với Excel.
- Chi phí một Task = số giây chạy × giá giờ ÷ 3600. Đây là ước tính; hệ thống ưu tiên số tiền RunningHub báo về (`cost_source = reported`) nếu có.

## 2. Hiện trạng hệ thống

### 2.1 Bảng giá hiện hành (`PRICING_CONFIG`)

| Chức năng (pipeline) | Giá | Máy mặc định |
|---|---|---|
| Face Swap `face_swap` | 100 credit | default |
| Đổi Trang Phục AI `outfit_change` | 100 credit | default |
| Đổi Người Trong Ảnh AI `person_replace` | 100 credit | default |
| Body Retouch `body_retouch` | 100 credit | default |
| Motion Control `motion_control` (v1) | 50 credit/giây, tối thiểu 3 giây, tối đa 20 giây | default |
| Motion Control v2 `motion_control_v2` | 50 credit/giây, tối thiểu 3 giây, tối đa 10 giây | plus |

Mọi tính năng ảnh cùng một giá 100 credit. Motion v1 và v2 cùng 50 credit/giây dù v2 chạy trên máy đắt hơn.

### 2.2 Gói nạp và Tier

| Tier | Giá | Credit | VNĐ/credit | Priority | Task chạy đồng thời | Cap video |
|---|---|---|---|---|---|---|
| FREE | 0 | 250 (tặng một lần) | n/a | 10 | 1 | 3 giây |
| Starter | 49.000 | 5.000 | 9,80 | 3 | 2 | 20 giây |
| Pro | 99.000 | 12.000 | 8,25 | 2 | 3 | 20 giây |
| Creator | 199.000 | 30.000 | 6,63 | 1 | 5 | 20 giây |

Nhận xét:
- Cả ba gói trả phí cùng cap video 20 giây. Khác biệt giữa các gói chỉ còn là **số credit trên mỗi đồng, Priority và số Task đồng thời**.
- Gói Creator rẻ hơn Starter 32% trên mỗi credit, nhưng chi phí GPU không giảm theo, nên đây là gói có biên mỏng nhất.
- Tier giữ được khi tổng credit sở hữu (số dư + đang HOLD) từ 100 trở lên.
- Credit tặng: 250/tài khoản, giới hạn 3 lần/IP/24 giờ (`anti-abuse.ts`). Task FREE chờ quá 15 phút bị gỡ và hoàn credit.

### 2.3 Cơ chế ghi nhận chi phí

Hệ thống đã ghi sẵn `instance_type`, `cost_seconds`, `cost_usd`, `cost_source` cho mỗi Task, và `admin-stats.service.ts` tính biên gộp theo từng pipeline và từng gói nạp (cả chi phí lãng phí của Task lỗi). Giá trị biên gộp là **số thật trong DB**, nên báo cáo này nên được đối chiếu lại với màn thống kê admin trước khi chốt giá.

### 2.4 Điểm cần lưu ý trong code

- `motionPrice()` trong `packages/contracts/src/tasks.ts` hardcode `50 * seconds`, dùng chung cho v1 và v2.
- `PipelinePricingSchema` trong `packages/contracts/src/wallet.ts` khóa cứng `z.literal(100)` và `z.literal(50)`. Mọi thay đổi giá phải sửa cả ở đây, trong `mocks.ts` và `PRICING_CONFIG`.
- Giá Motion không có thành phần cố định, trong khi chi phí GPU có (xem 3.2).

## 3. Chi phí GPU thực đo (từ Excel)

### 3.1 Tính năng ảnh

| Chức năng | Số mẫu | Chạy TB | Giá vốn TB | Giá vốn max |
|---|---|---|---|---|
| Đổi Trang Phục | 3 | 42 s | 266đ | 320đ |
| Face Swap | 12 | 48 s | 300đ | 433đ |
| Body Retouch | 4 | 58 s | 368đ | 477đ |
| Đổi Người | 4 | 141 s | 887đ | 1.351đ |

### 3.2 Motion Control: có chi phí cố định lớn

Hồi quy tuyến tính trên các mẫu (giây chạy = cố định + hệ số × giây video):

| | Số mẫu | Cố định | Mỗi giây video | Ghi chú |
|---|---|---|---|---|
| v1 (máy default) | 7 | ~202 s ≈ **1.268đ** | ~27,5 s ≈ **173đ** | Clip 3 giây chạy 4,5 đến 6 phút |
| v2 (máy plus) | 3 | ~71 s ≈ **601đ** | ~56,6 s ≈ **477đ** | Chỉ 3 mẫu, độ tin cậy thấp |

Hệ quả: clip càng ngắn, giá vốn trên mỗi giây video càng cao, trong khi giá bán là tuyến tính 50 credit/giây.

## 4. Biên gộp hiện tại

Doanh thu mỗi Task = số credit × VNĐ/credit của gói. Biên gộp = 1 − giá vốn / doanh thu.

### 4.1 Tính năng ảnh (100 credit/Task, theo giá vốn TB)

| Chức năng | Starter | Pro | Creator | Creator ở giá vốn max |
|---|---|---|---|---|
| Đổi Trang Phục | 73% | 68% | 60% | 52% |
| Face Swap | 69% | 64% | 55% | 35% |
| Body Retouch | 62% | 55% | 45% | 28% |
| Đổi Người | 9% | −8% | **−34%** | **−104%** |

### 4.2 Motion Control (50 credit/giây, theo mô hình hồi quy)

| Clip | v1 Starter | v1 Pro | v1 Creator | v2 Starter | v2 Pro | v2 Creator |
|---|---|---|---|---|---|---|
| 3 giây | −22% | −44% | −80% | −38% | −64% | −104% |
| 5 giây | 13% | −3% | −29% | −22% | −45% | −80% |
| 10 giây | 39% | 27% | 10% | −10% | −30% | −62% |
| 20 giây | 52% | 43% | 29% | n/a | n/a | n/a |

(v2 chỉ cho tối đa 10 giây.)

### 4.3 Chi phí credit tặng

Tài khoản FREE có 250 credit và cap video 3 giây. Cách dùng tốn nhất cho hệ thống là một clip Motion 3 giây (150 credit), giá vốn khoảng 1.800đ; hoặc hai Task Đổi Người (2 × 887đ ≈ 1.770đ). Mỗi tài khoản mới có thể tốn tới khoảng 1.800đ GPU. Giới hạn 3 tài khoản/IP/ngày giảm một phần rủi ro lạm dụng nhưng không loại bỏ.

## 5. Kết luận hiện trạng

1. **Đổi Người** lỗ ở mọi gói trả phí trừ Starter ở mức trung bình. Đây là vấn đề nghiêm trọng nhất.
2. **Motion Control v2** lỗ ở mọi gói và mọi độ dài. **Motion v1** lỗ với clip dưới 5 giây ở mọi gói, và gói Creator chỉ còn 10% ở clip 10 giây.
3. **Face Swap, Body Retouch** vẫn có lãi nhưng Creator xuống 28 đến 35% khi gặp Task nặng.
4. Chỉ **Đổi Trang Phục** an toàn (trên 50% ở mọi gói).
5. Nguyên nhân gốc: một giá chung 100 credit cho mọi ảnh, và một giá tuyến tính cho Motion trong khi chi phí GPU gồm phần cố định lớn.

## 6. Đề xuất phương án mới

### 6.0 Cập nhật: đối chiếu giá thị trường (ưu tiên hơn đề xuất Motion ở 6.1 và 6.2)

Giá tham khảo do người dùng cung cấp (chưa kiểm chứng độc lập):
- Nền tảng 1: 1.200 đến 2.400đ cho một video Motion Control (độ dài chưa rõ).
- Nền tảng 2: 2.200 đến 4.400đ, cao nhất 5.000 đến 6.000đ (chất lượng cao) cho video khoảng 10 đến 15 giây.

Giá vốn đo được (25.700đ/USD): v1 5 giây ≈ 2.100đ, 10 giây ≈ 3.000đ, 15 giây ≈ 3.900đ; v2 5 giây ≈ 3.000đ, 10 giây ≈ 5.400đ.

**Nhận định:** giá thị trường xấp xỉ giá vốn của mình, nên biên 60% không khả thi nếu cạnh tranh về giá. Biên gộp ngầm định theo giá bán:

| Giá bán | v1 10 giây (vốn 3.000đ) | v1 15 giây (vốn 3.900đ) | v2 10 giây (vốn 5.400đ) |
|---|---|---|---|
| 2.200đ | −36% | −76% | −144% |
| 4.400đ | 32% | 12% | −22% |
| 5.000đ | 40% | 23% | −7% |
| 6.000đ | 50% | 36% | 11% |

**Phương án A' (khuyến nghị, thay phần Motion của 6.1 và 6.2): giá tuyến tính 60 credit/giây cho v1, biên mục tiêu 25 đến 50%**

| Clip v1 | Credit | Starter | Pro | Creator | Biên S / P / C |
|---|---|---|---|---|---|
| 5 giây | 300 | 2.940đ | 2.475đ | 1.990đ | 27% / 14% / −7% |
| 10 giây | 600 | 5.880đ | 4.950đ | 3.980đ | 49% / 39% / 25% |
| 15 giây | 900 | 8.820đ | 7.425đ | 5.970đ | 56% / 48% / 35% |

- Clip 10 giây nằm trong khoảng giá của nền tảng 2 ở Pro và Creator, Starter hơi cao hơn mức 5.000 đến 6.000đ.
- Clip 15 giây ở Starter (8.820đ) cao hơn thị trường. Đây là điểm yếu cần chấp nhận hoặc giảm biên.
- Cần tăng thời lượng tối thiểu từ 3 lên 5 giây: ở 60 credit/giây, clip 3 giây (180 credit) thu 1.760đ ở Starter nhưng vốn 1.790đ nên lỗ ở mọi gói. Việc này đồng thời chặn gói FREE (cap 3 giây) dùng Motion, mỗi lần thử tốn khoảng 1.800đ.
- Tùy chọn: giảm credit gói Creator từ 30.000 xuống 25.000 (7,96đ/credit thay vì 6,63đ). Biên Creator ở clip 10 giây tăng từ 25% lên 37%, clip 15 giây từ 35% lên 46%, mà giá credit mỗi Task giữ nguyên.
- **Motion v2:** giá vốn 10 giây (5.400đ) cao hơn mức tối đa 5.000 đến 6.000đ của thị trường. Đề xuất tạm giới hạn v2 ở clip 5 giây trở xuống hoặc ẩn cho đến khi đo thêm (hiện chỉ 3 mẫu). Nếu bán ở 100 credit/giây thì clip 10 giây tốn 9.800đ ở Starter, gấp khoảng 2 lần thị trường.

**Đòn bẩy giảm giá vốn (nên làm trước khi chốt giá):**
1. Phần chi phí cố định của v1 (~202 giây ≈ 1.270đ) chiếm khoảng 42% giá vốn clip 10 giây. Nếu thời gian trong Excel gồm hàng chờ hoặc cold start mà RunningHub không tính tiền, giá vốn thật chỉ còn ~173đ/giây (clip 10 giây ≈ 1.700đ) và đủ khớp nền tảng 1. Cách kiểm: so `cost_usd` loại `reported` với loại `estimated` trong DB.
2. Thử loại máy hoặc độ phân giải thấp hơn cho Motion.
3. Đo thêm mẫu v2 và clip 5 đến 10 giây của v1 (hiện mẫu 5 giây là 0).

**Tính năng ảnh:** chưa có giá thị trường để đối chiếu, nên giữ đề xuất ở 6.1 và cần bạn cung cấp thêm.

Mục tiêu: biên gộp **tối thiểu 60% ở gói Creator** (gói rẻ nhất mỗi credit) theo giá vốn trung bình, để các gói khác có biên cao hơn. Công thức: credit = giá vốn ÷ (0,4 × 6,63).

### 6.1 Phương án A (khuyến nghị): tăng giá theo chi phí thật của từng chức năng

**Tính năng ảnh**

| Chức năng | Hiện tại | Đề xuất | Biên Creator (vốn TB) | Biên Creator (vốn max) |
|---|---|---|---|---|
| Đổi Trang Phục | 100 | **120** | 67% | 60% |
| Face Swap | 100 | **140** | 68% | 53% |
| Body Retouch | 100 | **160** | 65% | 55% |
| Đổi Người | 100 | **400** | 67% | 49% |

Mức credit tối thiểu để Creator đạt 60% theo vốn TB: Đổi Trang Phục 100, Face Swap 113, Body Retouch 139, Đổi Người 334 (70%: 134, 151, 185, 446). Các mức đề xuất ở trên lấy dư để chịu được Task nặng.

**Motion Control: giá = phí cố định + đơn giá/giây (đã được thay thế bởi A' ở 6.0 vì quá đắt so với thị trường)**

| | Phí cố định | Đơn giá | Clip 3 giây | Clip 10 giây | Clip 20 giây |
|---|---|---|---|---|---|
| v1 | 500 | 70 credit/giây | 710 | 1.200 | 1.900 |
| v2 (tạm, chờ đo thêm) | 250 | 190 credit/giây | 820 | 2.150 | không áp dụng (v2 tối đa 10 giây) |

Biên Creator theo mô hình hồi quy: v1 khoảng 62% ở mọi độ dài clip (3, 10, 20 giây), vì phí cố định đã bù phần cold start; v2 khoảng 63% ở clip 3 và 10 giây (mẫu ít, cần đo thêm).

Tác động:
- Credit trong gói đi ít xa hơn: gói Starter 5.000 credit làm được khoảng 12 Task Đổi Người (trước đây 50) hoặc khoảng 4 clip Motion v1 10 giây, 1.200 credit mỗi clip (trước đây 10 clip, 500 credit mỗi clip).
- Nên hiển thị giá ngay trên thẻ tính năng ở FE (đã lấy giá từ `/config/pricing`).
- Nếu muốn giữ con số credit trên từng tính năng dễ nhớ, có thể giảm credit trong gói thay vì tăng giá Task: hiệu quả kinh tế tương đương nhưng khó giải thích với khách hơn.

### 6.2 Phương án B (đơn giản, ít sửa code): giữ giá tuyến tính, đổi đơn giá và tăng tối thiểu

- Ảnh: giữ cấu trúc "một giá cho một Task" như phương án A.
- Motion: đơn giá/giây v1 = 100 credit, v2 = 200 credit; tăng thời lượng tối thiểu từ 3 lên 5 giây.
- Ưu điểm: không đổi hàm `motionPrice` sang dạng có phí cố định, chỉ cần đưa đơn giá vào cấu hình theo pipeline.
- Nhược điểm: biên Creator của v1 chỉ đạt 36% ở clip 5 giây (doanh thu 500 credit ≈ 3.317đ so với vốn ≈ 2.133đ) và 55% ở clip 10 giây; v2 đạt 55% (5 giây) và 60% (10 giây). Như vậy chỉ clip dài mới đạt mục tiêu 60%; clip ngắn vẫn dưới mục tiêu.

### 6.3 Phương án C (bổ sung): giảm chi phí thay vì tăng giá

- Hỏi RunningHub về gói cao hơn hoặc giảm giá khi nạp lớn; xem có tắt được cold start (giữ máy ấm) cho Motion hay không.
- Đo lại Đổi Người trên máy khác hoặc với độ phân giải thấp hơn (đang cố định 1280, `pipeline-config.ts`).
- Phương án này nên làm song song, không thay thế A hoặc B.

### 6.4 Các điều chỉnh đi kèm

1. **Credit tặng và FREE:** giảm credit tặng xuống 150 hoặc khóa Motion/Đổi Người cho FREE. Hiện 250 credit cho phép thử Motion 3 giây tốn khoảng 1.800đ/tài khoản.
2. **Chênh lệch giữa các gói:** cap video đã bằng nhau (20 giây), nên nên bàn lại xem có tách cap theo gói không (ví dụ v2 chỉ cho Pro trở lên).
3. **Tránh lỗ do lỗi:** Task lỗi hoàn 100% credit nhưng GPU vẫn tốn. Theo dõi `wastedCostUsd` trong admin-stats, nếu cao thì xem lại thời gian chờ (`deadlineMs` 360 giây cho Motion).
4. **Mã hóa giới hạn:** thêm cảnh báo trong admin khi biên gộp thực của bất kỳ pipeline nào xuống dưới 50%.

## 7. Việc cần sửa trong code nếu chọn phương án A

| Nơi | Thay đổi |
|---|---|
| `apps/api/src/modules/wallet/tier.ts` | Đổi giá từng pipeline; thêm đơn giá/giây Motion theo pipeline (A': v1 = 60 credit/giây) và nâng `MOTION_MIN_TRIM_SECONDS` lên 5 |
| `packages/contracts/src/wallet.ts` | Bỏ `z.literal(100)` và `z.literal(50)`; schema Motion có giá theo v1/v2 |
| `packages/contracts/src/tasks.ts` | `motionPrice()` nhận pipeline và dùng cấu hình thay vì hardcode 50 |
| `packages/contracts/src/mocks.ts` | Cập nhật dữ liệu giả cho khớp |
| `apps/api/src/modules/tasks/tasks.service.ts` | Truyền pipeline vào `motionPrice`; test cập nhật |
| `apps/api/src/modules/admin-stats/admin-stats.service.ts` | Biên gộp Motion theo giá thật từng pipeline |
| FE (`apps/web`) | Hiển thị giá mới trên thẻ tính năng, trimmer, dialog làm việc |

Task đang HOLD trước khi đổi giá giữ nguyên số credit đã giữ (HOLD ghi trong sổ cái), nên không cần di chuyển dữ liệu.

## 8. Giới hạn của số liệu và bước kiểm chứng

- Mẫu nhỏ: Đổi Trang Phục 3 mẫu, Đổi Người 4 mẫu, Motion v2 chỉ 3 mẫu. Mỗi giá trị chỉ đo một lần, chưa rõ có gồm hàng chờ hay cold start.
- Giá $0,88/giờ ghi trong Excel là tài khoản Enterprise-Shared (theo chú thích trong `instance-pricing.ts`). Nếu RunningHub báo về số tiền thật cho mỗi Task thì nên dùng số đó.
- **Việc nên làm trước khi đổi giá:** mở thống kê admin (biên gộp theo pipeline, đã dựng sẵn) trên dữ liệu thật vài tuần gần nhất, và đối chiếu với bảng ở mục 4. Nếu số thật khác nhiều so với Excel thì chỉnh lại mức đề xuất ở mục 6.
