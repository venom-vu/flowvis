# Chào mừng bạn đến với API của RunningHub. Dễ dàng gọi các API mô hình chuẩn của RunningHub.

## Bắt đầu sử dụng

### Đăng ký người dùng

Để sử dụng API Mô hình Chuẩn, hãy đăng ký làm người dùng RunningHub và nạp tiền vào ví của bạn. Chỉ hỗ trợ Khóa API Chia sẻ Doanh nghiệp.

### Lấy API Key của bạn

RunningHub tự động tạo một API KEY 32-bit duy nhất cho mỗi người dùng

Vui lòng giữ an toàn API KEY của bạn và không tiết lộ nó. Các bước tiếp theo sẽ phụ thuộc vào khóa này để thực hiện các thao tác

### Gửi yêu cầu

Gửi yêu cầu API. RunningHub API đã xử lý API Key giúp bạn, bạn chỉ cần gửi yêu cầu

```curl
curl --location --request POST 'https://www.runninghub.ai/openapi/v2/rhart-video-v3.1-pro/text-to-video' \
--header "Content-Type: application/json" \
--header "Authorization: Bearer ${RUNNINGHUB_API_KEY}" \
--data-raw '{
  "prompt": "An ancient castle floating among the clouds, surrounded by golden dragons and levitating islands. The sky is bathed in crimson-purple hues of sunset, with magical energy crackling through the air. The camera slowly pushes forward to reveal a grand and mysterious world.",
  "aspectRatio": "9:16",
  "duration": "8",
  "resolution": "720p"
}'
```

#### Tham số yêu cầu

| Lược đồ (Schema) | Loại   | Bắt buộc/Tùy chọn | Kết quả được tạo từ ứng dụng AI.  |
| ---------------- | ------ | ----------------- | --------------------------------- |
| `prompt`         | String | Bắt buộc          | Giới hạn độ dài văn bản: 5 - 8000 |
| `aspectRatio`    | String | Bắt buộc          | Giá trị Enum: [16:9, 9:16]        |
| `duration`       | String | Tùy chọn          | Giá trị Enum: [8]                 |
| `resolution`     | String | Bắt buộc          | Giá trị Enum: [720p, 1080p, 4k]   |

#### Ví dụ phản hồi

```json
{
  "taskId": "2013508786110730241",
  "status": "RUNNING",
  "errorCode": "",
  "errorMessage": "",
  "results": null,
  "clientId": "f828b9af25161bc066ef152db7b29ccc",
  "promptTips": "{\"result\": true, \"error\": null, \"outputs_to_execute\": [\"4\"], \"node_errors\": {}}"
}
```

#### Trường phản hồi

| Lược đồ (Schema) | Loại          | Kết quả được tạo từ ứng dụng AI.                                                                                                                                                                                                                                          |
| ---------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `taskId`         | String        | ID tác vụ, được sử dụng để truy vấn trạng thái tác vụ sau đó                                                                                                                                                                                                              |
| `status`         | String        | Trạng thái tác vụ hiện tại. Các trạng thái phổ biến: QUEUED, RUNNING, SUCCESS, FAILED                                                                                                                                                                                     |
| `errorCode`      | String        | Mã lỗi, chỉ trả về khi thất bại                                                                                                                                                                                                                                           |
| `errorMessage`   | String        | Thông báo lỗi chi tiết                                                                                                                                                                                                                                                    |
| `results`        | List          | Kết quả tạo (null khi gửi)                                                                                                                                                                                                                                                |
| ├ `url`          | String        | Quan trọng: Liên kết này chỉ có hiệu lực trong vòng 24 giờ. Sau khi quá trình tạo tác vụ hoàn tất, hãy nhớ tải xuống tệp video hoặc chuyển nó đến máy chủ của bạn trong khoảng thời gian này. Sau khi hết hạn, liên kết sẽ vĩnh viễn không hợp lệ và không thể khôi phục. |
| ├ `nodeId`       | String        | ID node luồng công việc tạo ra kết quả này                                                                                                                                                                                                                                |
| ├ `outputType`   | String        | Phần mở rộng tệp (ví dụ: png, mp4, txt)                                                                                                                                                                                                                                   |
| └ `text`         | String        | Nội dung được hiển thị ở đây nếu đầu ra là văn bản thuần túy                                                                                                                                                                                                              |
| `clientId`       | String        | ID phiên client, được sử dụng để nhận dạng kết nối hiện tại                                                                                                                                                                                                               |
| `promptTips`     | String (JSON) | Thông tin xác thực từ backend ComfyUI, bao gồm ID node cần thực thi hoặc thông tin gỡ lỗi                                                                                                                                                                                 |

### Kết quả truy vấn

Truy vấn tiến độ thực thi và kết quả cuối cùng theo ID tác vụ

#### Ví dụ yêu cầu

```curl
curl --location --request POST 'https://www.runninghub.ai/openapi/v2/query' \
--header "Content-Type: application/json" \
--header "Authorization: Bearer ${RUNNINGHUB_API_KEY}" \
--data-raw '{
  "taskId": "${RUNNINGHUB_TASKID}"
}'
```

#### Ví dụ phản hồi

```json
{
  "taskId": "2013508786110730241",
  "status": "SUCCESS",
  "errorCode": "",
  "errorMessage": "",
  "failedReason": {},
  "usage": {
    "consumeMoney": null,
    "consumeCoins": null,
    "taskCostTime": "0",
    "thirdPartyConsumeMoney": null
  },
  "results": [
    {
      "url": "https://rh-images-1252422369.cos.ap-beijing.myqcloud.com/b04e28cad0ee39193921a30a2eb4dc00/output/ComfyUI_00001_plhjr_1768892915.png",
      "nodeId": "2",
      "outputType": "png",
      "text": null
    }
  ],
  "clientId": "",
  "promptTips": ""
}
```

#### Trường phản hồi

| Lược đồ (Schema)           | Loại   | Kết quả được tạo từ ứng dụng AI.                                                                                                                                                                                                                                          |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `taskId`                   | String | ID tác vụ                                                                                                                                                                                                                                                                 |
| `status`                   | String | Trạng thái tác vụ cuối cùng. SUCCESS cho biết tạo thành công                                                                                                                                                                                                              |
| `results`                  | List   | Danh sách kết quả tạo, bao gồm hình ảnh, video hoặc văn bản đầu ra                                                                                                                                                                                                        |
| ├ `url`                    | String | Quan trọng: Liên kết này chỉ có hiệu lực trong vòng 24 giờ. Sau khi quá trình tạo tác vụ hoàn tất, hãy nhớ tải xuống tệp video hoặc chuyển nó đến máy chủ của bạn trong khoảng thời gian này. Sau khi hết hạn, liên kết sẽ vĩnh viễn không hợp lệ và không thể khôi phục. |
| ├ `nodeId`                 | String | ID node luồng công việc tạo ra kết quả này                                                                                                                                                                                                                                |
| ├ `outputType`             | String | Phần mở rộng tệp (ví dụ: png, mp4, txt)                                                                                                                                                                                                                                   |
| └ `text`                   | String | Nội dung được hiển thị ở đây nếu đầu ra là văn bản thuần túy                                                                                                                                                                                                              |
| `errorCode`                | String | Mã lỗi (nếu có)                                                                                                                                                                                                                                                           |
| `errorMessage`             | String | Thông báo lỗi (nếu có)                                                                                                                                                                                                                                                    |
| `failedReason`             | Object | Lý do thất bại liên quan đến ComfyUI                                                                                                                                                                                                                                      |
| `usage`                    | Object | Thông tin sử dụng tác vụ                                                                                                                                                                                                                                                  |
| ├ `thirdPartyConsumeMoney` | String | Số tiền tiêu thụ API bên thứ ba                                                                                                                                                                                                                                           |
| ├ `consumeMoney`           | String | Chi phí thời gian chạy                                                                                                                                                                                                                                                    |
| ├ `consumeCoins`           | String | RH coins đã tiêu thụ                                                                                                                                                                                                                                                      |
| └ `taskCostTime`           | String | Thời gian thực thi (thời gian chạy luồng công việc ComfyUI)                                                                                                                                                                                                               |

### Tải lên tệp

Các tham số tệp tài nguyên (ví dụ: `imageUrls`) chấp nhận URL tệp công khai hoặc URI dữ liệu Base64.

#### URL công khai

Truyền trực tiếp URL có thể truy cập công khai:

```json
{
  "imageUrls": ["https://example.com/image.png"]
}
```

#### URI dữ liệu Base64

Nhúng hình ảnh ở định dạng Base64:

```json
{
  "images": ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."]
}
```

#### API tải lên RH

Tải lên một tệp cục bộ để nhận URL.

**Điểm cuối (Endpoint):** `https://www.runninghub.ai/openapi/v2/media/upload/binary`

**Yêu cầu**

```curl
curl --location --request POST 'https://www.runninghub.ai/openapi/v2/media/upload/binary' \
--header 'Authorization: Bearer [Your API KEY]' \
--form 'file=@/path/to/image.png'
```

**Phản hồi**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "type": "image",
    "download_url": "xxxx.png",
    "fileName": "openapi/xxxx.png",
    "size": "3490"
  }
}
```

**Ghi chú:** URL được tải lên có hiệu lực trong một ngày. Sau khi hết hạn, không thể truy cập trực tiếp bằng URL.
