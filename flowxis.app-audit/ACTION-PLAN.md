# Kế hoạch hành động — flowxis.app

## Critical (ngay lập tức)
1. Đặt site URL production thành `https://flowxis.app` (biến môi trường Nuxt/Coolify), build lại. Sửa đồng thời canonical, og:url, og:image, JSON-LD, sitemap, dòng `Sitemap:` trong robots.txt.
2. Kiểm tra lại bằng `curl` 11 URL trong sitemap, rồi gửi sitemap mới trong Google Search Console (xác minh property `flowxis.app`).

## High (trong 1 tuần)
3. 301 `www.flowxis.app` → `flowxis.app`.
4. Thêm nội dung cho trang chủ và từng trang công cụ: mô tả, cách dùng, ví dụ trước/sau, FAQ (kèm FAQPage schema khi nội dung thật sự hiển thị).
5. Rà soát câu chữ nhạy cảm (Nâng Ngực, Face Swap) và thêm trang chính sách sử dụng.

## Medium (trong 1 tháng)
6. Rút gọn title trang chủ xuống ≤ 60 ký tự; đồng bộ tên card với từ khóa trang con.
7. Tối ưu ảnh banner (WebP/AVIF, width/height, lazy cho ảnh dưới màn hình đầu, alt mô tả).
8. Cache SSR ở edge cho trang công khai để giảm TTFB.
9. Bổ sung CSP, Permissions-Policy; thêm `includeSubDomains` cho HSTS nếu mọi subdomain đều HTTPS.
10. Mở rộng schema: `offers` cho SoftwareApplication, `sameAs`, `BreadcrumbList`.
11. Sửa/loại link nội bộ trỏ tới `/login` (404).

## Low / liên tục
12. Cân nhắc `llms.txt`, trang giới thiệu/liên hệ, blog hướng dẫn.
13. Chạy lại audit sau khi sửa canonical; chạy Lighthouse/CrUX và đo Core Web Vitals thật (chưa đo trong lần này).
