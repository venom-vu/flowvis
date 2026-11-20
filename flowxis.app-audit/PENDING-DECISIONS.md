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

- Đã sửa trong code, chưa commit/deploy: `siteUrl` mặc định đổi sang `https://flowxis.app` (`apps/web/nuxt.config.ts:50`) và rút title trang chủ (`apps/web/pages/index.vue:15`).
- Cần kiểm tra biến `NUXT_PUBLIC_SITE_URL` trên Coolify. Nếu đang đặt là domain adasweep.xyz thì sẽ ghi đè giá trị mặc định mới.
- Sau khi deploy: kiểm tra lại canonical, sitemap, og, JSON-LD và gửi lại sitemap trong Google Search Console.
- Test có sẵn bị fail từ trước: smoke test Story 1.4 yêu cầu ghim cố định `nuxt-gtag` (hiện `^5.1.0`, bản cài là 5.1.0).
- Chưa làm: tối ưu ảnh banner, cache edge giảm TTFB, mở rộng schema (`offers`, `sameAs`, `BreadcrumbList`), `llms.txt`, đo Core Web Vitals thật.
