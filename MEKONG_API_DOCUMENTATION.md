# Mekong API Integration Documentation

## Tổng quan

Hệ thống đã được tích hợp với Mekong API mới để thu thập và xử lý dữ liệu mực nước. API này cung cấp dữ liệu theo format JSON với các thuộc tính chi tiết về mực nước và các thông số liên quan.

## Cấu hình

### Environment Variables

Thêm biến sau vào file `.env`:

```env
URL_API_MEKONG=<your_mekong_api_url>
```

Ví dụ:

```env
URL_API_MEKONG=https://api.mekong.gov.vn/data/water-level
```

## Cấu trúc dữ liệu API Response

API trả về một array các object với cấu trúc sau:

```json
[
  {
    "lineColor": "#0066FF",
    "date_gmt": "2025-08-10",
    "val": 2.4,
    "ft": 4.5,
    "as": 3.5,
    "av": 2.79
  },
  {
    "lineColor": "#FF4500",
    "date_gmt": "2025-08-16",
    "val": 2.03,
    "P": 2.03,
    "ft": 4.5,
    "as": 3.5,
    "av": 2.98
  }
]
```

### Các trường dữ liệu

- `date_gmt`: Ngày theo GMT (format: YYYY-MM-DD)
- `val`: Giá trị mực nước chính (bắt buộc)
- `ft`: Thông số ft (tùy chọn)
- `as`: Thông số as (tùy chọn)
- `av`: Thông số av (tùy chọn)
- `P`: Thông số P (chỉ có trong một số record)
- `lineColor`: Màu sắc hiển thị trên biểu đồ

## API Endpoints

### 1. Fetch dữ liệu từ Mekong API

```http
POST /api/fetch-mekong-data
```

**Mô tả**: Gọi Mekong API, xử lý và lưu dữ liệu vào database

**Response**:

```json
{
  "success": true,
  "message": "Mekong data fetched and saved successfully",
  "dataPoints": 150,
  "dateRange": {
    "start": "2025-08-10T00:00:00.000Z",
    "end": "2025-08-25T00:00:00.000Z"
  },
  "database": {
    "replaced": 150,
    "total": 150
  },
  "timestamp": "2025-01-10T10:30:00.000Z"
}
```

### 2. Lấy dữ liệu Mekong từ database

```http
GET /api/get-mekong-data
```

**Query Parameters**:

- `from` (optional): Ngày bắt đầu (YYYY-MM-DD)
- `to` (optional): Ngày kết thúc (YYYY-MM-DD)
- `limit` (optional): Giới hạn số record (default: 1000)

**Ví dụ**:

```http
GET /api/get-mekong-data?from=2025-08-10&to=2025-08-25&limit=500
```

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "date_gmt": "2025-08-10T00:00:00.000Z",
      "val": 2.4,
      "ft": 4.5,
      "as": 3.5,
      "av": 2.79,
      "lineColor": "#0066FF",
      "dataType": "mekong",
      "source": "mekong_api",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "dateRange": {
    "from": "2025-08-10",
    "to": "2025-08-25"
  },
  "count": 150,
  "limit": 500,
  "timestamp": "2025-01-10T10:30:00.000Z"
}
```

### 3. Lấy dữ liệu Mekong gần nhất

```http
GET /api/get-recent-mekong-data
```

**Query Parameters**:

- `days` (optional): Số ngày gần nhất (default: 7)

**Ví dụ**:

```http
GET /api/get-recent-mekong-data?days=14
```

### 4. Lấy thống kê dữ liệu Mekong

```http
GET /api/get-mekong-stats
```

**Response**:

```json
{
  "success": true,
  "data": {
    "totalRecords": 500,
    "dateRange": {
      "from": "2025-08-01T00:00:00.000Z",
      "to": "2025-08-31T00:00:00.000Z"
    },
    "statistics": {
      "avgVal": 2.35,
      "minVal": 2.03,
      "maxVal": 2.65,
      "avgFt": 4.5,
      "avgAs": 3.5,
      "avgAv": 2.85
    },
    "lastUpdate": "2025-01-10T10:30:00.000Z"
  },
  "timestamp": "2025-01-10T10:30:00.000Z"
}
```

### 5. Lấy dữ liệu theo màu sắc

```http
GET /api/get-mekong-data-by-color
```

**Query Parameters**:

- `color` (required): Màu sắc cần lọc
- `limit` (optional): Giới hạn số record (default: 1000)

**Ví dụ**:

```http
GET /api/get-mekong-data-by-color?color=#FF4500&limit=100
```

### 6. Health check cho Mekong service

```http
GET /api/mekong-health
```

**Response**:

```json
{
  "success": true,
  "status": "healthy",
  "service": "mekong",
  "database": {
    "connected": true,
    "totalRecords": 500,
    "latestRecord": {
      "date": "2025-08-31T00:00:00.000Z",
      "val": 2.35,
      "updatedAt": "2025-01-10T10:30:00.000Z"
    }
  },
  "timestamp": "2025-01-10T10:30:00.000Z",
  "uptime": 3600.5
}
```

### 7. Xóa toàn bộ dữ liệu Mekong (Admin only)

```http
DELETE /api/clear-mekong-data
```

**Response**:

```json
{
  "success": true,
  "message": "All Mekong data cleared successfully",
  "deletedCount": 500,
  "timestamp": "2025-01-10T10:30:00.000Z"
}
```

## Cơ chế hoạt động

### 1. Data Processing Pipeline

1. **Fetch từ API**: Gọi URL_API_MEKONG để lấy dữ liệu raw
2. **Validation**: Kiểm tra format và tính hợp lệ của dữ liệu
3. **Processing**: Chuyển đổi và làm sạch dữ liệu
4. **Storage**: Lưu vào MongoDB với replace strategy
5. **Response**: Trả về kết quả chi tiết

### 2. Error Handling

- **Retry mechanism**: Tự động retry 3 lần với exponential backoff
- **Validation**: Kiểm tra dữ liệu đầu vào và đầu ra
- **Graceful degradation**: Xử lý lỗi mà không crash system

### 3. Database Schema

```javascript
{
  date_gmt: Date,        // Ngày GMT (unique index)
  val: Number,           // Giá trị mực nước chính
  ft: Number,            // Thông số ft (optional)
  as: Number,            // Thông số as (optional)
  av: Number,            // Thông số av (optional)
  P: Number,             // Thông số P (optional)
  lineColor: String,     // Màu sắc hiển thị
  dataType: String,      // "mekong"
  source: String,        // "mekong_api"
  createdAt: Date,       // Timestamp tạo
  updatedAt: Date        // Timestamp cập nhật
}
```

## Tích hợp với Frontend

Để sử dụng dữ liệu Mekong trong frontend, bạn có thể:

1. **Tạo service API**: Gọi các endpoints trên từ frontend
2. **Tạo component chart**: Hiển thị dữ liệu trên biểu đồ với `lineColor`
3. **Real-time updates**: Thiết lập scheduler để fetch data định kỳ
4. **Combine data**: Kết hợp với dữ liệu thủy triều khác nếu cần

## Ví dụ sử dụng

### Fetch dữ liệu mới từ API

```bash
curl -X POST http://localhost:3001/api/fetch-mekong-data
```

### Lấy dữ liệu 7 ngày gần nhất

```bash
curl "http://localhost:3001/api/get-recent-mekong-data?days=7"
```

### Lấy dữ liệu theo khoảng thời gian

```bash
curl "http://localhost:3001/api/get-mekong-data?from=2025-08-10&to=2025-08-20"
```

## Monitoring và Troubleshooting

1. **Health check**: Sử dụng `/api/mekong-health` để kiểm tra tình trạng
2. **Logs**: Kiểm tra console logs cho chi tiết quá trình xử lý
3. **Database**: Monitor MongoDB collection `mekong_data`
4. **API availability**: Đảm bảo URL_API_MEKONG accessible

## Scheduler (Tự động fetch dữ liệu)

Hệ thống đã được tích hợp scheduler để tự động fetch dữ liệu Mekong **mỗi 1 giờ** (tại phút thứ 0 của mỗi giờ) theo múi giờ GMT+7.

### Lịch trình Scheduler

- **Tần suất**: Mỗi 1 giờ
- **Thời gian**: 0 phút của mỗi giờ (00:00, 01:00, 02:00, ...)  
- **Múi giờ**: Asia/Ho_Chi_Minh (GMT+7)
- **Cron expression**: `0 * * * *`
- **Auto start**: Tự động chạy sau 15 giây khi server khởi động

### Scheduler Management Endpoints

#### 1. Lấy trạng thái scheduler

```http
GET /api/scheduler/mekong/status
```

**Response**:

```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "dataType": "mekong_water_level",
    "schedule": "0 * * * *",
    "timezone": "Asia/Ho_Chi_Minh",
    "description": "Mỗi 1 giờ (0 phút của mỗi giờ) GMT+7",
    "apiSource": "URL_API_MEKONG",
    "dataFields": ["date_gmt", "val", "ft", "as", "av", "P", "lineColor"],
    "method": "fetchAndSaveMekongData",
    "replaceStrategy": true,
    "retryMechanism": "Built-in exponential backoff (3 attempts)"
  },
  "timestamp": "2025-01-10T10:30:00.000Z"
}
```

#### 2. Trigger manual fetch ngay lập tức

```http
POST /api/scheduler/mekong/fetch-now
```

**Response**:

```json
{
  "success": true,
  "message": "Manual Mekong fetch completed",
  "dataPoints": 150,
  "dateRange": {
    "start": "2025-08-10T00:00:00.000Z",
    "end": "2025-08-25T00:00:00.000Z"
  },
  "timestamp": "2025-01-10T10:30:00.000Z"
}
```

#### 3. Lấy thống kê scheduler

```http
GET /api/scheduler/mekong/stats
```

**Response**:

```json
{
  "success": true,
  "message": "Mekong scheduler stats retrieved",
  "stats": {
    "totalRecords": 500,
    "dateRange": {
      "from": "2025-08-01T00:00:00.000Z",
      "to": "2025-08-31T00:00:00.000Z"
    },
    "statistics": {
      "avgVal": 2.35,
      "minVal": 2.03,
      "maxVal": 2.65
    },
    "lastUpdate": "2025-01-10T10:30:00.000Z"
  },
  "scheduler": {
    "isRunning": true,
    "schedule": "0 * * * *"
  },
  "timestamp": "2025-01-10T10:30:00.000Z"
}
```

#### 4. Health check scheduler

```http
GET /api/scheduler/mekong/health
```

**Response** (Status 200 = healthy, 503 = unhealthy):

```json
{
  "success": true,
  "status": "healthy",
  "scheduler": {
    "isRunning": true,
    "lastScheduleRun": "N/A",
    "nextScheduleRun": "Next hour at minute 0"
  },
  "data": {
    "totalRecords": 500,
    "hasRecentData": true,
    "lastDataUpdate": "2025-01-10T10:30:00.000Z",
    "dateRange": {
      "from": "2025-08-01T00:00:00.000Z",
      "to": "2025-08-31T00:00:00.000Z"
    }
  },
  "timestamp": "2025-01-10T10:30:00.000Z"
}
```

### Logs và Monitoring

Scheduler sẽ log các thông tin sau:

```bash
🌊 Bắt đầu fetch dữ liệu Mekong theo lịch trình...
⏰ Thời gian: 10/1/2025, 10:00:00 AM
📡 Calling Mekong API... (Attempt 1/3)
✅ Mekong scheduler: 150 records được lưu thành công
📅 Khoảng thời gian: 2025-08-10T00:00:00.000Z đến 2025-08-25T00:00:00.000Z
```

### Graceful Shutdown

Scheduler sẽ được dừng tự động khi server shutdown:

```bash
🛑 SIGTERM received, shutting down gracefully
⏹️ Tất cả Schedulers đã được dừng (Tide, Station Update, HoDauTieng, Mekong)
✅ Process terminated
```

## Notes

- ✅ **Scheduler tự động**: Chạy mỗi 1 giờ như các service khác
- ✅ **API không yêu cầu parameters**: Gọi trực tiếp URL_API_MEKONG
- ✅ **Replace strategy**: Dữ liệu được replace hoàn toàn mỗi lần fetch
- ✅ **Error handling**: Retry mechanism với exponential backoff
- ✅ **Health monitoring**: Endpoints để kiểm tra tình trạng scheduler
- ✅ **Manual trigger**: Có thể gọi fetch manual khi cần
- ✅ **Graceful shutdown**: Dừng scheduler khi server shutdown
- ✅ **Logging chi tiết**: Track quá trình fetch và lỗi
- ✅ **Tương thích pattern**: Theo cùng design với các scheduler khác
