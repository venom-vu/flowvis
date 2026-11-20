# Hạng mục chờ quyết định — flowxis.app (ghi nhận 2026-11-21)

Chưa triển khai. Chi tiết nằm trong `FULL-AUDIT-REPORT.md` và `ACTION-PLAN.md`.

| # | Hạng mục | Mức | Ghi chú |
|---|---|---|---|
| 1 | 301 `www.flowxis.app` → `flowxis.app` | High | Hiện www trả 200, nội dung trùng. Cần cấu hình ở Cloudflare/Caddy, không nằm trong repo. |
| 2 | Thêm nội dung và FAQ cho trang chủ và trang công cụ | High | Trang chủ chỉ ~1.090 ký tự. FAQPage schema chỉ thêm khi nội dung hiển thị thật. |
| 3 | Thêm CSP, Permissions-Policy; HSTS `includeSubDomains` | Medium | Hiện có HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy. |
| 4 | Sửa link nội bộ trỏ tới `/login` (đang 404) | Medium | Cần tìm link nào trỏ tới `/login`. |
| 5 | Rà soát câu chữ nhạy cảm (Nâng Ngực, Face Swap), thêm trang chính sách sử dụng | High | Rủi ro chính sách nội dung, chưa đo bằng dữ liệu. |

## Việc liên quan cần nhớ

- Đã sửa trong code, chưa commit: `siteUrl` mặc định `https://flowxis.app`, title trang chủ, ghim `nuxt-gtag` 5.1.0, cookie `Secure`, ảnh banner WebP, alt ảnh card, `public/llms.txt`. Trên production, canonical/sitemap/og/JSON-LD đã đúng domain; dòng `Sitemap:` trong robots.txt còn sai do Cloudflare cache 4 giờ, cần purge `/robots.txt`.
- Sau khi deploy: kiểm tra lại canonical, sitemap, og, JSON-LD và gửi lại sitemap trong Google Search Console.
- Chưa làm: mở rộng schema (`offers`, `sameAs` cần dữ liệu thật; `BreadcrumbList`), đo Core Web Vitals thật, xoá ảnh PNG/JPG gốc trong `public/banner/`.

## Đã quyết định (2026-11-21)

| Hạng mục | Quyết định | Lý do |
|---|---|---|
| Cache trang SSR ở Cloudflare để giảm TTFB | Không cache lúc này (phương án C) | Trang chủ render khác nhau theo cookie `flowxis-session-hint`, cache sai có thể lộ khung đã đăng nhập cho người khác. Xem lại khi có nhu cầu cụ thể về TTFB. |
| `HttpOnly` cho cookie `flowxis-session-hint` | Giữ nguyên, không thêm | Client cần đọc cookie này để dựng giao diện. Cookie chỉ là gợi ý giao diện, không chứa token. Đã thêm `Secure`. |
