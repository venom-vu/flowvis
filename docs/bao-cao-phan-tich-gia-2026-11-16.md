# Báo cáo phân tích giá credit và đề xuất điều chỉnh

Ngày lập: 2026-11-16
Phạm vi: đối chiếu giá credit hiện hành với chi phí thực tế trên RunningHub cho 6 chức năng.

## 1. Tóm tắt

| Chức năng | Giá hiện tại | Kết luận |
|---|---|---|
| Face Swap | 100 credit | Hợp lý, lãi 2,0–2,9 lần chi phí |
| Đổi trang phục | 100 credit | Hợp lý, nhưng mới có 1 mẫu |
| Body Retouch | 100 credit | Hợp lý, lãi khoảng 1,5–2,3 lần (chi phí lấy từ CSV) |
| Person Replace | 100 credit | **Lỗ ở cả 3 gói** (thu $0,026–0,038, tốn khoảng $0,049) |
| Motion Control v1 | 50 credit/giây | Lãi mỏng ở gói Creator; **lỗ với clip ngắn (3 giây)** |
| Motion Control v2 | 50 credit/giây | **Lỗ ở gói Pro và Creator**, lỗ với clip ngắn |

Hai vấn đề chính:
1. Person Replace bán dưới giá vốn.
2. Motion bị lỗ ở clip ngắn do chi phí máy có phần cố định. v2 dùng máy `plus` đắt hơn khoảng 34% nhưng đang bán cùng giá với v1.

Độ tin cậy: mẫu rất nhỏ (1–8 lượt mỗi chức năng, 4 lượt mỗi pipeline Motion). Các con số cho biết hướng đi, chưa đủ để chốt giá cuối.

## 2. Nguồn dữ liệu và phương pháp

- **CSV hoá đơn RunningHub** (`billing_usage_details_20261116005840.csv`, 53 dòng): chi phí `Wallet Amount` (USD) và `Billing Duration (sec)` cho từng task.
- **File `apps/api/.env`**: 6 workflow ID, loại máy của từng pipeline. `RUNNINGHUB_INSTANCE_MOTION_CONTROL_V2=plus`.
- **Bảng `tasks` trong DB local** (141 task, từ 2026-11-09 đến 2026-11-15), chỉ chạy `SELECT`. Ghép với CSV bằng `runninghub_task_id` = `Task ID`. DB cho biết độ dài clip thật (`params.seconds`) và số credit đã giữ (`hold_amount`).
- **Giá credit** lấy từ `packages/contracts/src/wallet.ts` (bảng Tier và `z.literal(100)`, `z.literal(50)`) và `packages/contracts/src/tasks.ts` (`motionPrice`).
- Tỷ giá `USD_VND=26000`.

Giá máy RunningHub (tài khoản Enterprise-Shared), khớp với `instance-pricing.ts` và với tỷ lệ tính được từ CSV:

| Loại máy | USD/giờ |
|---|---|
| default | 0,88 |
| plus | 1,18 |
| ultra | 2,35 |

### Giới hạn của dữ liệu

- CSV chỉ có tên app tiếng Trung, không có App ID. Việc ghép app với chức năng dựa trên tên app và giá giờ máy, và với Motion thì dựa trên khớp `runninghub_task_id` với DB (chắc chắn hơn).
- Các app `抖音短视频人物替换` và `视频自动人物替换-V2版本` không có trong DB, nên không dùng để định giá.
- Các dòng CSV có `RH Coin` khác 0 và `Wallet Amount` trống không phải lượt gọi API, đã loại khỏi phép tính.
- DB chỉ lưu `cost_usd` cho một phần task thành công. Body Retouch không có chi phí trong DB, chi phí của chức năng này lấy từ CSV theo tên app (丰胸大师, 丰胸-平地变高楼), nên chỉ là ước tính.
- Chưa có dữ liệu về chi phí của task lỗi hoặc quá hạn.
- Chưa tính phí cổng thanh toán và chi phí lưu trữ R2.

## 3. Giá trị thực của 1 credit

| Gói | Giá (VND) | Credit | VND/credit | USD/credit |
|---|---|---|---|---|
| Starter | 49.000 | 5.000 | 9,80 | 0,000377 |
| Pro | 99.000 | 12.000 | 8,25 | 0,000317 |
| Creator | 199.000 | 30.000 | 6,63 | 0,000255 |

Gói Creator rẻ hơn Starter khoảng 32% mỗi credit. Vì vậy **mức giá sàn phải kiểm tra ở tỷ lệ Creator** (trường hợp xấu nhất). Một chức năng chỉ an toàn khi vẫn có lãi ở gói Creator.

Doanh thu mỗi lượt 100 credit: Starter $0,0377, Pro $0,0317, Creator $0,0255.
Doanh thu mỗi giây Motion (50 credit): Starter $0,0188, Pro $0,0159, Creator $0,0128.

Gói FREE tặng 500 credit (không có doanh thu). Chi phí tối đa mỗi tài khoản FREE nếu dùng hết vào chức năng đắt nhất là khoảng $0,24 (5 lượt Person Replace với giá hiện tại). Với Face Swap thì khoảng $0,065.

## 4. Phân tích từng chức năng

### 4.1. Các chức năng ảnh

| Chức năng | Chi phí TB / lượt | Số mẫu | Lãi (Starter) | Lãi (Pro) | Lãi (Creator) |
|---|---|---|---|---|---|
| Face Swap (换头V5) | $0,013 | 8 (CSV) | 2,9x | 2,4x | 2,0x |
| Đổi trang phục (一键换装) | $0,013 | 1 | 2,9x | 2,4x | 2,0x |
| Body Retouch (丰胸) | $0,0165 (từ $0,009 đến $0,021) | 4 (CSV) | 2,3x | 1,9x | 1,5x |
| Person Replace (图片换人+换背景) | $0,0485 | 4 | 0,78x | 0,65x | 0,53x |

(Lãi = doanh thu / chi phí. Dưới 1,0x là lỗ.)

- **Face Swap, Đổi trang phục, Body Retouch:** giữ 100 credit. Lượt Body Retouch đắt nhất ($0,021) vẫn có lãi 1,2x ở Creator, nhưng biên mỏng.
- **Person Replace:** chạy khoảng 108–247 giây trên máy `default`, chi phí $0,027–0,061. Ở mọi gói đều dưới giá vốn: lỗ 22% (Starter), 35% (Pro), 47% (Creator).

### 4.2. Motion Control

Ghép được 8 task theo `runninghub_task_id`, có độ dài clip thật:

| Pipeline | Máy | Clip (giây) | Credit thu | Chi phí RH | Chi phí/giây |
|---|---|---|---|---|---|
| v1 | default | 3 | 150 | $0,067 | $0,022 |
| v1 | default | 3 | 150 | $0,084 | $0,028 |
| v1 | default | 10 | 500 | $0,089 | $0,009 |
| v1 | default | 15 | 750 | $0,131 | $0,009 |
| v2 | plus | 3 | 150 | $0,024 | $0,008 |
| v2 | plus | 4 | 200 | $0,081 | $0,020 |
| v2 | plus | 10 | 500 | $0,128 | $0,013 |
| v2 | plus | 16 | 800 | $0,304 | $0,019 |

Tính gộp: v1 tốn $0,0120/giây clip (31 giây, $0,371), v2 tốn $0,0163/giây clip (33 giây, $0,537).

| Pipeline | Lãi gộp Starter | Pro | Creator |
|---|---|---|---|
| v1 | +57% | +33% | +6% |
| v2 | +16% | −2% | −22% |

Nhận xét:
- **Clip ngắn lỗ.** Với v1, clip 3 giây thu $0,038–0,057 nhưng tốn $0,067–0,084, lỗ ở mọi gói. Chi phí v1 có phần cố định khoảng $0,05–0,06 mỗi lượt cộng phần theo giây khoảng $0,005/giây (ước lượng thô từ 4 điểm).
- **v1 ở gói Creator** chỉ hòa vốn khi clip từ khoảng 8 giây trở lên.
- **v2 có chi phí dao động mạnh.** Clip 16 giây tốn $0,304 (hơn 2 lần clip 10 giây, $0,128), trong khi clip 3 giây chỉ $0,024. Với 4 mẫu, chưa xác định được quy luật.
- **v2 và v1 đang cùng giá 50 credit/giây** (DB cho thấy v2 dùng chung `motionPrice`), dù máy `plus` đắt hơn 34% và thời gian chạy dài hơn.
- Giới hạn độ dài clip (cập nhật 2026-11-16, đã áp dụng vào mã): gói FREE tối đa 3 giây; các gói trả phí không giới hạn theo gói mà theo chức năng (Motion v1 tối đa 20 giây, v2 tối đa 10 giây). Trước đó là theo Tier: FREE 5 giây, Starter 10, Pro 15, Creator 20. Người dùng gói rẻ nhất chỉ làm được clip ngắn, nên lỗ clip ngắn là tình huống thường gặp.

## 5. Đề xuất điều chỉnh

Nguyên tắc: biên lãi gộp tối thiểu khoảng 30% ở tỷ lệ gói Creator (xấu nhất), trước phí thanh toán.

### Đề xuất 1 (ưu tiên cao): Tăng giá Person Replace

| Mức giá | Doanh thu (Starter / Pro / Creator) | Lãi so với $0,0485 |
|---|---|---|
| 100 (hiện tại) | $0,038 / $0,032 / $0,026 | 0,78x / 0,65x / 0,53x |
| 150 | $0,057 / $0,048 / $0,038 | 1,17x / 0,98x / 0,79x |
| 200 | $0,075 / $0,063 / $0,051 | 1,55x / 1,31x / 1,05x |
| **250 (khuyến nghị)** | $0,094 / $0,079 / $0,064 | 1,94x / 1,63x / 1,31x |

Mức 150 vẫn lỗ ở Pro và Creator. Mức 200 mới chỉ hòa vốn ở Creator. Khuyến nghị 250 credit để có biên đệm cho chi phí dao động (lượt đắt nhất $0,061).
Lựa chọn thay thế: giảm chi phí bằng cách rút ngắn workflow nếu chất lượng cho phép (thời gian chạy hiện 108–247 giây, độ phân giải đầu ra 1280).

### Đề xuất 2 (ưu tiên cao): Giá sàn cho Motion v1

Giữ 50 credit/giây, thêm **số giây tính tiền tối thiểu là 8 giây (400 credit)**. Kiểm tra với dữ liệu ở gói Creator:
- 3 giây: thu 400 credit = $0,102, chi phí $0,067–0,084. Có lãi.
- 10 giây: thu 500 credit = $0,128, chi phí $0,089. Có lãi.
- 15 giây: thu 750 credit = $0,191, chi phí $0,131. Có lãi.

Nếu muốn giữ trải nghiệm clip ngắn có giá thấp, phương án thay thế là phí cố định cộng giá theo giây, ví dụ 150 credit + 40 credit/giây (clip 3 giây = 270 credit, $0,069 ở Creator, vẫn hơi dưới chi phí $0,084). Phương án giá sàn đơn giản và an toàn hơn.

### Đề xuất 3 (ưu tiên cao): Tách giá Motion v2

Đặt **80 credit/giây, tối thiểu 8 giây (640 credit)**. Kiểm tra ở gói Creator:
- 16 giây: thu 1.280 credit = $0,326, chi phí $0,304. Có lãi mỏng.
- 10 giây: thu 800 credit = $0,204, chi phí $0,128. Có lãi.
- 4 giây (tính 8 giây): thu 640 credit = $0,163, chi phí $0,081. Có lãi.
- Biên gộp theo giá trung bình: Starter +86%, Pro +58%, Creator +25%.

Phương án thay thế: thử chạy v2 trên máy `default` (0,88 USD/giờ, rẻ hơn 25%) và so chất lượng. Nếu chất lượng chấp nhận được thì giữ 50–60 credit/giây. Cần kiểm tra chéo trước khi quyết định vì chưa có dữ liệu so sánh.

### Đề xuất 4 (ưu tiên trung bình): Giữ nguyên các chức năng ảnh

Face Swap, Đổi trang phục, Body Retouch giữ 100 credit. Có thể xem xét giảm nhẹ để tăng sức cạnh tranh sau khi đủ dữ liệu, vì biên lãi 2x vẫn còn dư địa.

### Đề xuất 5 (ưu tiên trung bình): Rà soát bảng gói

Creator rẻ hơn Starter khoảng 32% mỗi credit. Nếu tăng giá chức năng không đủ, có thể giảm mức chiết khấu của gói Creator (ví dụ giảm số credit từ 30.000 xuống 27.000) hoặc thêm giá sàn theo gói. Chỉ cân nhắc sau khi áp dụng các đề xuất 1–3.

### Đề xuất 6 (ưu tiên trung bình): Cải thiện đo lường

- Ghi `cost_usd`, `cost_seconds` cho **mọi** task, kể cả Body Retouch và task lỗi/quá hạn. Hiện Body Retouch thành công nhưng không có chi phí trong DB. Task lỗi cũng không có, nên chưa biết RunningHub có tính phí hay không.
- Thêm báo cáo biên lãi theo pipeline và theo độ dài clip trong trang admin (`admin-stats`), dùng `cost_usd` so với `hold_amount` đã quy đổi theo gói của người dùng.
- Cảnh báo khi một task có chi phí vượt ngưỡng (ví dụ lượt 抖音 tốn $0,505, hơn 20 lần mức bình thường).

## 6. Điểm cần chỉnh trong mã nguồn

Các vị trí liên quan (cần kiểm tra thêm phạm vi ảnh hưởng, kể cả frontend và test):

- `packages/contracts/src/wallet.ts` (khoảng dòng 389–393): `faceSwapCredits`, `outfitChangeCredits`, `personReplaceCredits` là `z.literal(100)`, `motionControlCreditsPerSecond` là `z.literal(50)`. Đổi giá phải sửa các literal này.
- `packages/contracts/src/tasks.ts` (dòng 5–9): `motionPrice(seconds)` trả `50 * seconds`. Cần tách theo pipeline (v1/v2) và thêm số giây tối thiểu.
- `packages/contracts/src/tasks.ts` (khoảng dòng 305–320): refinement kiểm tra `price % motionPrice(1) === 0` sẽ cần cập nhật khi đổi công thức giá.
- `apps/api/src/modules/tasks/tasks.service.ts` (khoảng dòng 737): nơi tính `price = motionPrice(seconds)` khi tạo task.
- Giao diện (`apps/web`): các nơi hiển thị giá và bộ đếm "50 credit × số giây" trong trimmer.
- Cần có kế hoạch cho task đang ở hàng đợi tại thời điểm đổi giá (giữ nguyên `hold_amount` đã ghi).

## 7. Việc cần làm tiếp

1. Xác nhận App ID Person Replace đang chạy thật: `apps/api/.env` đặt `2074882496994570241`, còn `.env.example` ghi `1977229030422388737`.
2. Thu thêm dữ liệu Motion (khoảng 30–50 task, đủ độ dài 3–20 giây, cả v1 và v2) để hiệu chỉnh mô hình "phí cố định + theo giây".
3. Chạy thử v2 trên máy `default` và so chất lượng.
4. Kiểm tra RunningHub có tính phí task lỗi hay không.
5. Quyết định mức biên lãi mục tiêu, tính cả phí thanh toán, rồi chốt bảng giá mới.
6. Cập nhật contracts, backend, frontend, test, rồi triển khai đồng bộ.

## 8. Phụ lục: công thức

- Doanh thu mỗi lượt = credit × (giá gói / số credit của gói), quy đổi sang USD theo `USD_VND=26000`.
- Chi phí mỗi lượt = `Wallet Amount` trong CSV (khớp `cost_usd` trong DB).
- Lãi = doanh thu / chi phí.
- Biên lãi gộp = (doanh thu − chi phí) / chi phí.
