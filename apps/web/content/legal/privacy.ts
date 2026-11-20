import type { LegalDocument } from './terms';

export const privacy: LegalDocument = {
  version: '2026-11-01',
  effectiveDate: '01/11/2026',
  updatedAt: '19/11/2026',
  status: 'final',
  title: 'Chính sách quyền riêng tư',
  subtitle:
    'flowxis thu thập dữ liệu gì, dùng để làm gì, lưu trong bao lâu và bạn kiểm soát dữ liệu của mình như thế nào.',
  sections: [
    {
      id: 'nguyen-tac-chung',
      heading: '1. Cam kết của chúng tôi',
      paragraphs: [
        'flowxis chỉ thu thập lượng dữ liệu tối thiểu cần thiết để cung cấp dịch vụ và giữ tài khoản của bạn an toàn.',
        'Chúng tôi không bán hay chia sẻ dữ liệu cá nhân, ảnh hoặc video của bạn cho mục đích quảng cáo, và không dùng tệp của bạn để huấn luyện mô hình AI.',
      ],
    },
    {
      id: 'du-lieu-thu-thap',
      heading: '2. Dữ liệu chúng tôi thu thập',
      paragraphs: [],
      bullets: [
        'Tài khoản: email và mã định danh Google khi bạn đăng nhập. Chúng tôi không truy cập mật khẩu hay hộp thư của bạn.',
        'Tệp của bạn: ảnh, video, tùy chọn xử lý bạn chọn và kết quả AI tạo ra.',
        'Credit và thanh toán: số dư, lịch sử sử dụng credit, các đơn nạp tiền, và thời điểm bạn đồng ý Điều khoản.',
        'Dữ liệu chống lạm dụng: thông tin thiết bị và mạng được mã hóa một chiều, chỉ dùng để ngăn việc tạo nhiều tài khoản trục lợi.',
        'Cookie: dùng để duy trì phiên đăng nhập, chống lạm dụng và bảo mật tài khoản.',
      ],
      outroParagraphs: [
        'Công cụ Tải video TikTok chạy trên trình duyệt của bạn. flowxis không nhận và không lưu liên kết hay video TikTok.',
      ],
    },
    {
      id: 'muc-dich-su-dung',
      heading: '3. Mục đích sử dụng',
      paragraphs: [],
      bullets: [
        'Đăng nhập và hiển thị lịch sử tác vụ của riêng bạn;',
        'Xử lý ảnh, video theo yêu cầu của bạn;',
        'Quản lý credit, đối soát nạp tiền và hoàn credit khi tác vụ không thành công;',
        'Ngăn chặn gian lận và bảo vệ an toàn dịch vụ;',
        'Xử lý báo cáo vi phạm và yêu cầu từ cơ quan có thẩm quyền.',
      ],
    },
    {
      id: 'chia-se-ben-thu-ba',
      heading: '4. Chia sẻ dữ liệu',
      paragraphs: [
        'Chúng tôi chỉ chia sẻ dữ liệu ở mức cần thiết với các đối tác hỗ trợ vận hành dịch vụ (như đăng nhập, xử lý AI và lưu trữ tệp), và chỉ nhằm mục đích cung cấp dịch vụ cho bạn. Chúng tôi cũng có thể cung cấp thông tin khi pháp luật yêu cầu.',
      ],
    },
    {
      id: 'thoi-han-luu-tru',
      heading: '5. Thời gian lưu trữ',
      paragraphs: [
        'Tệp của bạn được tự động xóa theo thời hạn sau:',
      ],
      bullets: [
        'Tệp tải lên chưa hoàn tất: xóa sau 1 ngày.',
        'Ảnh, video đầu vào: xóa sau 7 ngày.',
        'Kết quả AI: xóa sau 30 ngày kể từ khi hoàn thành.',
      ],
      outroParagraphs: [
        'Thông tin tài khoản, lịch sử tác vụ và giao dịch credit được giữ khi tài khoản còn hoạt động để bảo đảm số dư chính xác và phục vụ đối soát. Khi có yêu cầu gỡ bỏ hợp lệ, chúng tôi có thể xóa tệp sớm hơn các thời hạn trên.',
      ],
    },
    {
      id: 'lien-ket-chia-se-va-bao-mat',
      heading: '6. Liên kết chia sẻ và bảo mật',
      paragraphs: [
        'Bất kỳ ai có liên kết chia sẻ đều xem được kết quả, không cần đăng nhập, cho đến khi bạn thu hồi, liên kết hết hạn sau 30 ngày hoặc bị gỡ do vi phạm. Hãy chỉ gửi liên kết cho người bạn tin tưởng.',
        'Dữ liệu của bạn được truyền qua kết nối mã hóa và chỉ truy cập được bằng đường dẫn có giới hạn thời gian.',
      ],
    },
    {
      id: 'quyen-cua-ban-va-xoa-du-lieu',
      heading: '7. Quyền của bạn',
      paragraphs: [
        'Bạn có quyền xem thông tin tài khoản và lịch sử của mình, thu hồi liên kết chia sẻ bất cứ lúc nào, và yêu cầu chỉnh sửa hoặc xóa tài khoản cùng dữ liệu cá nhân.',
        'Để yêu cầu xóa, hãy gửi email từ chính địa chỉ đã đăng ký tới liên hệ ở cuối trang. Chúng tôi xử lý trong vòng 7 ngày làm việc. Dữ liệu giao dịch tối thiểu có thể được giữ lại hoặc ẩn danh theo quy định pháp luật.',
      ],
    },
    {
      id: 'cap-nhat-va-lien-he',
      heading: '8. Cập nhật chính sách',
      paragraphs: [
        'Chính sách có thể được cập nhật khi dịch vụ hoặc quy định pháp luật thay đổi. Phiên bản và ngày cập nhật mới nhất luôn hiển thị ở đầu trang. Mọi thắc mắc xin liên hệ qua thông tin cuối trang.',
      ],
    },
  ],
};
