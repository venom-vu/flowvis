// Nội dung SEO hiển thị dưới form của từng công cụ. Chỉ nêu điều sản phẩm thực sự làm; không ghi giá (giá lấy từ cấu hình).
export interface ToolSeoContent {
  heading: string;
  intro: string;
  steps: readonly string[];
  tips: readonly string[];
}

export const TOOL_SEO_CONTENT = {
  'face-swap': {
    heading: 'Hoán đổi khuôn mặt bằng AI hoạt động thế nào',
    intro:
      'Công cụ lấy khuôn mặt từ ảnh nguồn và ghép vào ảnh đích, đồng bộ ánh sáng, góc nghiêng và biểu cảm để kết quả trông tự nhiên. Phù hợp với ảnh chân dung và ảnh lookbook thương mại.',
    steps: [
      'Tải ảnh khuôn mặt nguồn rõ nét.',
      'Tải ảnh đích có khuôn mặt nhìn rõ.',
      'Bấm tạo, theo dõi tiến trình rồi tải ảnh kết quả.',
    ],
    tips: [
      'Dùng ảnh nguồn chụp thẳng, đủ sáng, không bị che mặt.',
      'Ảnh đích nên thấy rõ khuôn mặt để AI nhận diện được.',
    ],
  },
  'outfit-change': {
    heading: 'Đổi trang phục AI: mặc thử quần áo lên người mẫu',
    intro:
      'Tải ảnh người mẫu và ảnh trang phục, AI thay quần áo nhưng giữ nguyên dáng người, khuôn mặt và bối cảnh. Hữu ích để xem trước phối đồ hoặc làm ảnh sản phẩm thời trang.',
    steps: [
      'Tải ảnh người mẫu rõ dáng.',
      'Tải ảnh trang phục cần mặc.',
      'Bấm tạo và tải ảnh kết quả khi hoàn tất.',
    ],
    tips: [
      'Ảnh người mẫu nên thấy rõ toàn bộ phần thân cần thay đồ.',
      'Ảnh trang phục nên rõ nét, nền đơn giản.',
    ],
  },
  'person-replace': {
    heading: 'Đổi người trong ảnh bằng AI, giữ nguyên bối cảnh',
    intro:
      'Thay nhân vật trong ảnh gốc bằng một nhân vật khác, giữ nguyên bối cảnh và bố cục của ảnh. Dùng khi bạn muốn giữ khung cảnh nhưng đổi người xuất hiện trong đó.',
    steps: [
      'Tải ảnh gốc cần thay người.',
      'Tải ảnh nhân vật mới rõ nét.',
      'Bấm tạo và tải ảnh kết quả khi hoàn tất.',
    ],
    tips: [
      'Nhân vật mới nên có tư thế gần với người cần thay.',
      'Ảnh nhân vật mới cần đủ sáng và không bị cắt mất phần thân.',
    ],
  },
  'body-retouch': {
    heading: 'Nâng ngực AI tự nhiên theo 10 mức điều chỉnh',
    intro:
      'AI tự nhận diện vùng cần chỉnh và tinh chỉnh theo mức bạn chọn từ 1 đến 10, giữ chi tiết trang phục và không làm biến dạng hậu cảnh. Theo Điều khoản, người dùng và mọi người xuất hiện trong ảnh tải lên phải đủ 18 tuổi.',
    steps: [
      'Tải ảnh toàn thân hoặc bán thân đủ ánh sáng.',
      'Kéo thanh trượt để chọn mức điều chỉnh từ 1 đến 10.',
      'Bấm tạo và tải ảnh kết quả khi hoàn tất.',
    ],
    tips: [
      'Bắt đầu từ mức mặc định rồi tăng dần để kết quả tự nhiên.',
      'Ảnh nên rõ vùng cần chỉnh và không bị che bởi vật khác.',
    ],
  },
  'motion-control': {
    heading: 'Điều khiển chuyển động: biến ảnh tĩnh thành video',
    intro:
      'Ánh xạ chuyển động từ video mẫu sang nhân vật trong ảnh tĩnh. Bạn cắt đoạn video mẫu theo từng giây và thấy ngay số credit cần dùng trước khi tạo.',
    steps: [
      'Tải ảnh nhân vật rõ dáng.',
      'Tải video chuyển động mẫu rồi cắt đoạn cần dùng.',
      'Bấm tạo và tải video kết quả khi hoàn tất.',
    ],
    tips: [
      'Chọn video mẫu có một người chuyển động rõ ràng.',
      'Chỉ cắt đúng đoạn cần dùng để tiết kiệm credit.',
    ],
  },
  'motion-control-v2': {
    heading: 'Điều khiển chuyển động v2: tạo video từ ảnh và video mẫu',
    intro:
      'Phiên bản v2 của công cụ điều khiển chuyển động: ánh xạ chuyển động từ video mẫu sang ảnh nhân vật tĩnh, cắt thời lượng theo giây và tính phí theo độ dài.',
    steps: [
      'Tải ảnh nhân vật rõ dáng.',
      'Tải video chuyển động mẫu rồi cắt đoạn cần dùng.',
      'Bấm tạo và tải video kết quả khi hoàn tất.',
    ],
    tips: [
      'Chọn video mẫu có một người chuyển động rõ ràng.',
      'Chỉ cắt đúng đoạn cần dùng để tiết kiệm credit.',
    ],
  },
  'motion-background': {
    heading: 'Motion control nền video: tạo video chuyển động từ ảnh và video mẫu',
    intro:
      'Ánh xạ chuyển động từ video mẫu sang ảnh nhân vật kèm nền, cắt thời lượng theo giây và tính phí theo độ dài.',
    steps: [
      'Tải ảnh nhân vật rõ dáng.',
      'Tải video chuyển động mẫu rồi cắt đoạn cần dùng.',
      'Bấm tạo và tải video kết quả khi hoàn tất.',
    ],
    tips: [
      'Chọn video mẫu có một người chuyển động rõ ràng.',
      'Chỉ cắt đúng đoạn cần dùng để tiết kiệm credit.',
    ],
  },
  'veo-3': {
    heading: 'Veo 3: tạo video AI từ văn bản, ảnh hoặc khung hình',
    intro:
      'Veo 3 tạo video 8 giây có âm thanh. Bạn có thể chỉ mô tả bằng văn bản, thêm một ảnh để làm động, hoặc đưa khung hình đầu và cuối để AI nội suy chuyển động ở giữa.',
    steps: [
      'Chọn chế độ Text to Video, Image to Video hoặc Frames Video.',
      'Nhập mô tả, tải ảnh nếu chế độ yêu cầu, chọn tỉ lệ khung và độ phân giải.',
      'Bấm tạo, theo dõi tiến trình rồi tải video kết quả.',
    ],
    tips: [
      'Mô tả rõ chủ thể, hành động, chuyển động camera và âm thanh mong muốn.',
      'Ở chế độ Frames, chọn hai khung hình cùng bố cục để chuyển động mượt.',
    ],
  },
  'muse-video': {
    heading: 'Muse Video: tạo video AI từ ảnh tham chiếu',
    intro:
      'Muse Video tạo video khoảng 10 giây, 720p, có âm thanh từ 1 đến 9 ảnh tham chiếu kèm mô tả. Bạn chọn tỉ lệ khung hoặc để AI theo tỉ lệ ảnh.',
    steps: [
      'Tải từ 1 đến 9 ảnh tham chiếu, tổng dung lượng không quá 11 MB.',
      'Nhập mô tả chủ thể, hành động và chuyển động camera, chọn tỉ lệ khung nếu cần.',
      'Bấm tạo, theo dõi tiến trình rồi tải video kết quả.',
    ],
    tips: [
      'Mô tả rõ chủ thể, hành động và chuyển động camera mong muốn.',
      'Sắp xếp ảnh theo thứ tự quan trọng; ảnh được gửi đúng thứ tự bạn chọn.',
    ],
  },
  'multi-angle-product': {
    heading: 'Tạo ảnh sản phẩm đa góc bằng AI',
    intro:
      'Tải 3 ảnh của cùng một sản phẩm, AI dựng một ảnh thể hiện sản phẩm từ nhiều góc nhìn. Phù hợp làm ảnh bán hàng, ảnh giới thiệu sản phẩm trên sàn thương mại điện tử.',
    steps: [
      'Tải 3 ảnh sản phẩm rõ nét, mỗi ô một ảnh.',
      'Kiểm tra lại ba ảnh rồi bấm tạo.',
      'Theo dõi tiến trình và tải ảnh kết quả khi hoàn tất.',
    ],
    tips: [
      'Chụp sản phẩm ở các góc khác nhau để AI có đủ chi tiết.',
      'Dùng nền đơn giản, đủ sáng và không bị che khuất sản phẩm.',
    ],
  },
} as const satisfies Record<string, ToolSeoContent>;

export type ToolSeoId = keyof typeof TOOL_SEO_CONTENT;
