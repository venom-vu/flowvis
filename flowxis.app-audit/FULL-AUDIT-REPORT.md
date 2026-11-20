# SEO Audit — https://flowxis.app/ (2026-11-20)

**SEO Health Score: 53/100** · Loại hình: SaaS công cụ AI tạo ảnh/video (tiếng Việt, trả theo credit)

**Phạm vi & giới hạn:** render trang chủ, kiểm tra thủ công robots.txt, sitemap, 11 URL trong sitemap (title/description/canonical/H1/JSON-LD), header HTTP, TTFB. KHÔNG chạy subagent chuyên biệt, Lighthouse/CrUX, GSC/GA4, backlink, screenshot. Điểm Performance, Images và AI chỉ là ước lượng dựa trên HTML.

## Vấn đề nghiêm trọng nhất (Critical)

### 1. Canonical, og:url, JSON-LD, sitemap và robots trỏ sang domain khác
Mọi trang đều khai báo `https://flowxis.adasweep.xyz/...`, trong khi site phục vụ ở `flowxis.app`. Host `flowxis.adasweep.xyz` không phản hồi (curl trả `000`).
- `<link rel="canonical">` → adasweep.xyz (trang chủ + toàn bộ 10 trang con đã kiểm tra)
- `og:url`, `og:image` (`/og-image.png`) → adasweep.xyz, nên ảnh chia sẻ mạng xã hội có thể hỏng
- JSON-LD Organization/WebSite/SoftwareApplication → adasweep.xyz
- `sitemap.xml`: cả 11 `<loc>` và dòng `Sitemap:` trong robots.txt → adasweep.xyz

Hậu quả: Google nhận tín hiệu canonical sang host không truy cập được, nên `flowxis.app` có nguy cơ không được lập chỉ mục hoặc bị loại. Nhiều khả năng đây là biến môi trường (site URL của Nuxt) vẫn đặt theo domain cũ ở Coolify. Repo có `https://flowxis.adasweep.xyz` trong cấu hình deploy.
**Sửa:** đặt site URL production = `https://flowxis.app`, build lại, kiểm tra lại canonical/sitemap/og/JSON-LD.

## High

### 2. `www.flowxis.app` trả 200, không redirect
Hai host cùng phục vụ một nội dung, gây trùng lặp. Thêm 301 từ www về apex (hoặc ngược lại) và để canonical khớp.

### 3. Không có trang nội dung chiều sâu / chỉ dựa vào trang công cụ
Trang chủ chỉ có khoảng 1.090 ký tự văn bản trích xuất: H1 "Chọn Công Cụ AI" và 7 card. Không có FAQ, hướng dẫn, ví dụ trước/sau, blog. Từ khóa mục tiêu (face swap, đổi trang phục AI, motion control, Veo 3) cần nội dung dài hơn mới cạnh tranh được.

### 4. Rủi ro chính sách nội dung
"Nâng Ngực", Face Swap (deepfake) và Body Retouch thuộc nhóm nhạy cảm (nội dung người lớn/giả mạo hình ảnh). Có thể ảnh hưởng quảng cáo, xếp hạng và hiển thị AI Overviews. Cân nhắc câu chữ trung tính hơn trong title/description, thêm trang chính sách sử dụng chấp nhận được và cơ chế đồng ý. Đây là nhận định rủi ro, chưa đo bằng dữ liệu.

## Medium

- **Title trang chủ dài:** "Kho Công Cụ AI — flowxis: Face Swap, Đổi Trang Phục, Motion Control" (~68 ký tự), có thể bị cắt. Description 160 ký tự là hợp lý.
- **Tên card chung chung/lệch từ khóa:** "Điều Video", "Điều V2", "Đổi Phục", "Hoán Mặt" khác với tên trang con ("Điều Khiển Chuyển Động", "Đổi Trang Phục AI"). Thống nhất tên theo cụm từ người dùng tìm.
- **Hình ảnh:** trang chủ có 6 thẻ `<img>`. Card Face Swap/Đổi Phục/Nâng Ngực không thấy `loading="lazy"` trong phần trích xuất; alt "Muse Video" quá ngắn. Chưa đo dung lượng thực (ảnh PNG banner nên chuyển WebP/AVIF).
- **TTFB 1,07 giây** (qua Cloudflare, `cf-cache-status: DYNAMIC`, SSR Nuxt). Có thể cache trang tĩnh ở edge để giảm.
- **Thiếu header bảo mật:** có HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy; chưa thấy CSP và Permissions-Policy. HSTS thiếu `includeSubDomains`.
- **Cookie `flowxis-session-hint` đặt cho cả khách** (ảnh hưởng nhẹ tới cache và quyền riêng tư; kiểm tra banner đồng ý nếu có Google Analytics `G-NDLKGX3G5F`).
- **Schema:** `SoftwareApplication` ở trang chủ cần `offers`, `aggregateRating` (chỉ khi có đánh giá thật). `Organization` thiếu `sameAs`, contact. Trang con có 2 JSON-LD, chưa kiểm tra chi tiết/`BreadcrumbList`.
- **Trang `/login` trả 404** dù nội dung đề cập dialog đăng nhập; kiểm tra link nội bộ nào trỏ tới đó.

## Low

- `llms.txt` trả 404 (tùy chọn; hiện robots đã phân tách bot tìm kiếm AI và bot huấn luyện).
- `/admin` redirect 302 (đúng) và đã `Disallow` trong robots.txt. Lưu ý `Disallow` không thay thế `noindex`.
- Chưa có trang liên hệ/giới thiệu để tăng E-E-A-T (có terms, privacy).

## Điểm làm tốt

- HTTPS, HTTP→HTTPS 308, HTTP/2/3, HSTS.
- `lang="vi"`, mỗi trang có 1 H1, title và description riêng, độ dài description phù hợp.
- Sitemap hợp lệ, gọn, đủ trang công khai; robots.txt phân biệt tốt bot tìm kiếm AI (cho phép) và bot huấn luyện (chặn).
- JSON-LD có `@id` liên kết Organization ↔ WebSite; og/twitter card đã khai báo.
- Favicon, apple-touch-icon, og-image tồn tại và phản hồi 200 (trên `flowxis.app`).

## Điểm theo hạng mục

| Hạng mục | Trọng số | Điểm |
|---|---|---|
| Technical SEO | 22% | 45 |
| Content Quality | 23% | 55 |
| On-Page SEO | 20% | 50 |
| Schema | 10% | 55 |
| Performance (ước lượng) | 10% | 60 |
| AI Search Readiness | 10% | 60 |
| Images (ước lượng) | 5% | 65 |
| **Tổng** | | **53** |
