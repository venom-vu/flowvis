export type LegalStatus = 'draft' | 'final';

export interface LegalSection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  outroParagraphs?: string[];
}

export interface LegalDocument {
  version: string;
  effectiveDate: string;
  updatedAt: string;
  status: LegalStatus;
  title: string;
  subtitle: string;
  sections: LegalSection[];
}

export const terms: LegalDocument = {
  version: '2026-11-01',
  effectiveDate: '01/11/2026',
  updatedAt: '17/11/2026',
  status: 'final',
  title: 'Điều khoản dịch vụ',
  subtitle:
    'Những điều bạn cần biết khi sử dụng flowvis: độ tuổi, quyền hình ảnh, credit, thanh toán và hoàn tiền.',
  sections: [
    {
      id: 'chap-nhan-dieu-khoan',
      heading: '1. Chấp nhận Điều khoản',
      paragraphs: [
        'Khi đăng nhập, tải tệp lên, dùng công cụ AI hoặc nạp credit, bạn đồng ý với Điều khoản này và Chính sách quyền riêng tư của flowvis.',
        'Khi Điều khoản có thay đổi quan trọng, bạn có thể được yêu cầu xác nhận lại trước khi tiếp tục sử dụng.',
      ],
    },
    {
      id: 'dieu-kien-tai-khoan',
      heading: '2. Tài khoản và độ tuổi',
      paragraphs: [
        'Bạn cam kết đủ 18 tuổi trở lên. Tài khoản đăng nhập bằng Google, chỉ dành cho cá nhân bạn và bạn chịu trách nhiệm về mọi hoạt động trên tài khoản.',
      ],
      bullets: [
        'Tài khoản mới hợp lệ được tặng 250 credit dùng thử.',
        'Ưu đãi dùng thử có giới hạn theo thiết bị và mạng để bảo đảm công bằng.',
        'Nghiêm cấm tạo nhiều tài khoản ảo, dùng bot hoặc lợi dụng lỗi để trục lợi credit.',
      ],
    },
    {
      id: 'mo-ta-dich-vu',
      heading: '3. Dịch vụ cung cấp',
      paragraphs: [
        'flowvis cung cấp các công cụ xử lý ảnh và video bằng AI:',
      ],
      bullets: [
        'Ảnh: Hoán đổi khuôn mặt, Đổi trang phục, Đổi người trong ảnh, Tinh chỉnh dáng người.',
        'Video: Điều khiển chuyển động (Motion Control), cắt đoạn theo từng giây.',
        'Tiện ích tải video TikTok không logo, chạy ngay trên trình duyệt của bạn.',
        'Tệp hỗ trợ: ảnh JPG, PNG, WebP (tối đa 10 MB); video MP4, MOV (tối đa 100 MB).',
      ],
    },
    {
      id: 'quyen-so-huu-noi-dung',
      heading: '4. Nội dung bạn tải lên',
      paragraphs: [
        'Bạn cam kết có đầy đủ quyền sử dụng ảnh, video và nội dung văn bản bạn tải lên.',
      ],
      bullets: [
        'Mọi người xuất hiện trong ảnh hoặc video phải đủ 18 tuổi trở lên.',
        'Bạn đã được người trong ảnh hoặc video đồng ý rõ ràng trước khi tải lên.',
        'Bạn cho phép flowvis xử lý tệp tạm thời chỉ để thực hiện yêu cầu của bạn.',
      ],
    },
    {
      id: 'noi-dung-bi-cam',
      heading: '5. Nội dung bị cấm',
      paragraphs: [
        'Nghiêm cấm dùng flowvis cho các nội dung sau:',
      ],
      bullets: [
        'Bất kỳ nội dung nào liên quan đến người dưới 18 tuổi.',
        'Nội dung khiêu dâm, khỏa thân lộ bộ phận nhạy cảm, bạo lực cực đoan.',
        'Nội dung bôi nhọ, quấy rối, mạo danh hoặc lừa đảo.',
        'Nội dung vi phạm bản quyền hoặc quy định pháp luật.',
        'Dùng công cụ tải TikTok để sao chép, phân phối trái phép video của người khác.',
      ],
    },
    {
      id: 'ket-qua-ai-va-chia-se',
      heading: '6. Kết quả AI và chia sẻ',
      paragraphs: [
        'Ảnh kết quả được gắn dấu hiệu nhận biết là nội dung do AI tạo. Bạn không được cố ý xóa hoặc giả mạo dấu hiệu này để đánh lừa người xem.',
        'Nếu bạn tuân thủ Điều khoản, bạn được dùng kết quả cho mục đích cá nhân lẫn thương mại hợp pháp và tự chịu trách nhiệm về việc sử dụng đó.',
        'Liên kết chia sẻ cho phép bất kỳ ai có đường dẫn xem kết quả cho đến khi bạn thu hồi, liên kết hết hạn sau 30 ngày hoặc bị gỡ do vi phạm.',
      ],
    },
    {
      id: 'credit-va-hang-tai-khoan',
      heading: '7. Credit và hạng tài khoản',
      paragraphs: [
        'Mỗi tác vụ AI được tính bằng credit, hiển thị rõ trước khi bạn bắt đầu:',
      ],
      bullets: [
        'Công cụ xử lý ảnh: 100 credit mỗi lượt.',
        'Motion Control: 50 credit mỗi giây video sau khi cắt (tối thiểu 3 giây).',
        'Credit được tạm giữ khi tạo tác vụ và chỉ bị trừ khi tác vụ thành công. Nếu tác vụ thất bại, quá thời gian chờ hoặc bị hủy, 100% credit được hoàn lại.',
        'Hạng tài khoản FREE có giới hạn về độ dài video, số tác vụ chạy cùng lúc và thời gian chờ tối đa 15 phút (quá hạn sẽ tự hủy và hoàn credit). Các hạng trả phí có giới hạn cao hơn và được ưu tiên xử lý; hạng này được giữ khi số dư từ 100 credit trở lên.',
        'Credit không có thời hạn sử dụng, không quy đổi thành tiền mặt và không chuyển nhượng giữa các tài khoản.',
      ],
    },
    {
      id: 'thanh-toan-va-hoan-tien',
      heading: '8. Thanh toán và hoàn tiền',
      paragraphs: [
        'Bạn nạp credit bằng chuyển khoản quét mã VietQR theo các gói tại trang Bảng giá.',
      ],
      bullets: [
        'Mã QR có hiệu lực 15 phút. Vui lòng chuyển đúng số tiền và đúng nội dung chuyển khoản hiển thị.',
        'Đơn hợp lệ thường được duyệt trong vòng 15 phút trong khung giờ 08:00 – 23:00 (giờ Việt Nam); đơn ngoài khung giờ được duyệt từ 08:00 sáng hôm sau.',
        'Chuyển sai nội dung, sai số tiền hoặc quá hạn sẽ được xem xét thủ công. Hãy liên hệ hỗ trợ kèm biên lai.',
        'Sau khi credit đã được cộng, tiền đã thanh toán không được hoàn lại, trừ khi: (i) lỗi từ phía flowvis khiến dịch vụ không dùng được hoặc cộng thiếu credit; (ii) bạn chuyển nhầm, chuyển thừa hoặc chuyển trùng và được xác minh qua sao kê.',
      ],
    },
    {
      id: 'kiem-duyet-va-khoa-tai-khoan',
      heading: '9. Xử lý vi phạm',
      paragraphs: [
        'Khi phát hiện vi phạm, gian lận hoặc nhận được báo cáo hợp lệ, flowvis có quyền áp dụng ngay các biện pháp sau mà không cần báo trước:',
      ],
      bullets: [
        'Gỡ nội dung vi phạm và thu hồi các liên kết chia sẻ liên quan;',
        'Tạm khóa hoặc khóa vĩnh viễn tài khoản và thu hồi credit có nguồn gốc gian lận.',
      ],
      outroParagraphs: [
        'Để báo cáo vi phạm, hãy dùng liên kết “Báo cáo vi phạm” ở chân trang kèm mã tác vụ hoặc liên kết chia sẻ.',
      ],
    },
    {
      id: 'mien-tru-trach-nhiem',
      heading: '10. Miễn trừ và giới hạn trách nhiệm',
      paragraphs: [
        'Dịch vụ được cung cấp “nguyên trạng”. Chúng tôi không bảo đảm mọi kết quả AI đều đúng kỳ vọng của bạn hoặc dịch vụ không bao giờ gián đoạn. Khi bảo trì hoặc quá tải, tác vụ không hoàn thành sẽ được hoàn 100% credit.',
        'Trong phạm vi pháp luật cho phép, flowvis không chịu trách nhiệm về thiệt hại phát sinh từ nội dung bạn tải lên mà không có quyền hợp pháp, việc bạn sử dụng kết quả trái pháp luật, hoặc sự cố từ bên thứ ba như ngân hàng và dịch vụ đăng nhập.',
        'Mức trách nhiệm tối đa của flowvis không vượt quá tổng số tiền bạn đã nạp trong 03 tháng gần nhất trước thời điểm phát sinh sự việc.',
      ],
    },
    {
      id: 'luat-ap-dung-va-thay-doi',
      heading: '11. Luật áp dụng và thay đổi Điều khoản',
      paragraphs: [
        'Điều khoản này theo pháp luật Việt Nam. Tranh chấp được ưu tiên giải quyết bằng thương lượng; nếu không thành, sẽ do Tòa án có thẩm quyền tại Việt Nam giải quyết.',
        'flowvis có thể cập nhật Điều khoản; phiên bản mới được đăng công khai kèm ngày hiệu lực.',
      ],
    },
  ],
};
