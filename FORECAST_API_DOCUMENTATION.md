# 🌊 API DỰ BÁO MỰC NƯỚC - DOCUMENTATION

## 📋 Tổng quan

API dự báo mực nước tích hợp với backend Node.js hiện tại, cung cấp khả năng:
- 🔄 Tự động thu thập dữ liệu từ API Hồ Dầu Tiếng 
- 💾 Lưu trữ dữ liệu lịch sử trong MongoDB
- 📊 Query và phân tích dữ liệu thống kê
- ⏰ Scheduler tự động đồng bộ dữ liệu
- 🎯 RESTful API endpoints chuẩn

**Base URL:** `http://localhost:5000/api/forecast`

---

## 🏗️ Kiến trúc hệ thống

```
📦 Forecast API System
├── 🗂️ Models (MongoDB Schemas)
│   ├── ForecastStation.js      # Quản lý trạm dự báo
│   └── ForecastData.js         # Dữ liệu lịch sử và dự báo
├── 🔧 Services 
│   └── forecastService.js      # Business logic
├── 🎮 Controllers
│   └── forecastController.js   # HTTP request handlers
├── 🛣️ Routes
│   └── forecastRoutes.js       # API endpoints
├── ⏰ Schedulers
│   └── forecastScheduler.js    # Tự động đồng bộ dữ liệu
└── 🔧 Utils
    └── forecastApiInitializer.js # Khởi tạo sample data
```

---

## 🚀 Cài đặt và chạy

### 1. Kiểm tra dependencies

Đảm bảo các packages đã được cài đặt trong `package.json`:

```json
{
  "dependencies": {
    "axios": "^1.11.0",
    "mongoose": "^8.17.0", 
    "joi": "^18.0.0",
    "moment": "^2.30.1",
    "node-cron": "^4.2.1"
  }
}
```

### 2. Khởi động server

Server sẽ tự động khởi tạo forecast API khi chạy:

```bash
cd backend
npm start
```

**Log khởi tạo:**
```
📊 Khởi tạo Forecast Data Scheduler...
✅ Forecast data scheduler initialized
🔄 Initializing forecast stations...
✅ Station initialized: Hồ Dầu Tiếng
```

### 3. Kiểm tra hoạt động

```bash
curl http://localhost:5000/api/forecast/health
```

**Response:**
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "healthy",
    "timestamp": "2024-09-11T10:30:00.000Z",
    "service": "forecast-api",
    "version": "1.0.0"
  }
}
```

---

## 📍 API Endpoints

### 🏥 Health Check

#### `GET /api/forecast/health`
Kiểm tra trạng thái service

**Response:**
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "healthy",
    "uptime": 3600.5,
    "memory": {...}
  }
}
```

---

### 🏛️ Quản lý trạm (Station Management)

#### `GET /api/forecast/stations`
Lấy danh sách trạm dự báo

**Query Parameters:**
- `status` (optional): `active`, `inactive`, `maintenance`
- `province` (optional): Tên tỉnh/thành phố
- `parameterType` (optional): `MUCNUOCHO`, `QDEN`, `QXA`, `RAINFALL`

**Response:**
```json
{
  "success": true,
  "message": "Found 2 stations",
  "data": [
    {
      "stationId": "HDT_001",
      "stationUuid": "613bbcf5-212e-43c5-9ef8-69016787454f",
      "stationName": "Hồ Dầu Tiếng",
      "location": {
        "latitude": 11.2838,
        "longitude": 106.3619
      },
      "administrativeInfo": {
        "province": "Tây Ninh",
        "district": "Dầu Tiếng",
        "riverSystem": "Sài Gòn"
      },
      "supportedParameters": [
        {
          "parameterCode": "MUCNUOCHO",
          "parameterName": "Mực nước hồ",
          "unit": "m"
        }
      ],
      "status": "active"
    }
  ]
}
```

#### `POST /api/forecast/stations`
Đăng ký trạm dự báo mới

**Request Body:**
```json
{
  "stationUuid": "new-station-uuid",
  "stationName": "Tên trạm mới",
  "location": {
    "latitude": 10.123,
    "longitude": 106.456
  },
  "administrativeInfo": {
    "province": "TP.HCM",
    "riverSystem": "Sài Gòn"
  },
  "supportedParameters": [
    {
      "parameterCode": "MUCNUOCHO",
      "parameterName": "Mực nước",
      "unit": "m"
    }
  ]
}
```

#### `GET /api/forecast/stations/:stationUuid`
Lấy thông tin chi tiết một trạm

#### `PUT /api/forecast/stations/:stationUuid`
Cập nhật thông tin trạm

---

### 📊 Thu thập dữ liệu (Data Fetching)

#### `POST /api/forecast/fetch-data`
Lấy dữ liệu từ API Hồ Dầu Tiếng

**Request Body:**
```json
{
  "stationUuid": "613bbcf5-212e-43c5-9ef8-69016787454f",
  "parameterType": "MUCNUOCHO",
  "startDate": "2024-09-10T00:00:00Z",
  "endDate": "2024-09-11T00:00:00Z",
  "forecastStart": "2024-09-11T00:00:00Z",
  "forecastEnd": "2024-09-14T00:00:00Z",
  "overwrite": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data fetched and processed successfully",
  "data": {
    "apiData": [...],
    "metadata": {
      "station": "Hồ Dầu Tiếng",
      "parameter": "Mực nước hồ",
      "totalRecords": 72
    },
    "processStats": {
      "processed": 72,
      "inserted": 65,
      "updated": 7,
      "errors": 0
    }
  }
}
```

#### `POST /api/forecast/sync-station/:stationUuid`
Đồng bộ dữ liệu cho một trạm cụ thể

**Request Body:**
```json
{
  "parameterTypes": ["MUCNUOCHO", "QDEN"],
  "overwrite": true
}
```

#### `POST /api/forecast/sync-all`
Đồng bộ dữ liệu cho tất cả trạm active

**Response:**
```json
{
  "success": true,
  "message": "Sync completed: 2/2 stations successful, 144 records processed",
  "data": {
    "totalStations": 2,
    "successfulSyncs": 2,
    "failedSyncs": 0,
    "totalRecords": 144,
    "errors": []
  }
}
```

---

### 🔍 Truy vấn dữ liệu (Data Querying)

#### `POST /api/forecast/query`
Query dữ liệu lịch sử với filters phức tạp

**Request Body:**
```json
{
  "stationUuids": ["613bbcf5-212e-43c5-9ef8-69016787454f"],
  "parameterTypes": ["MUCNUOCHO"],
  "startDate": "2024-09-10T00:00:00Z",
  "endDate": "2024-09-11T00:00:00Z",
  "dataSources": ["realtime", "forecast"],
  "limit": 100,
  "offset": 0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Found 95 records",
  "data": {
    "data": [
      {
        "stationUuid": "613bbcf5-212e-43c5-9ef8-69016787454f",
        "parameterType": "MUCNUOCHO",
        "timestamp": "2024-09-11T08:00:00.000Z",
        "value": 12.45,
        "dataSource": "realtime",
        "qualityInfo": {
          "qualityFlag": "good",
          "confidence": 0.95
        }
      }
    ],
    "pagination": {
      "total": 95,
      "limit": 100,
      "offset": 0,
      "pages": 1
    }
  }
}
```

#### `GET /api/forecast/data/:stationUuid/:parameterType`
Lấy dữ liệu cho trạm và parameter cụ thể

**Query Parameters:**
- `startDate` (optional): ISO datetime
- `endDate` (optional): ISO datetime  
- `dataSource` (optional): `realtime`, `forecast`, `manual`
- `limit` (optional): Number, default 1000
- `offset` (optional): Number, default 0

**Example:**
```
GET /api/forecast/data/613bbcf5-212e-43c5-9ef8-69016787454f/MUCNUOCHO?startDate=2024-09-10T00:00:00Z&limit=50
```

#### `GET /api/forecast/data/:stationUuid/:parameterType/latest`
Lấy dữ liệu mới nhất

**Query Parameters:**
- `dataSource` (optional): Loại dữ liệu cần lấy

**Response:**
```json
{
  "success": true,
  "message": "Latest data found",
  "data": {
    "stationUuid": "613bbcf5-212e-43c5-9ef8-69016787454f",
    "parameterType": "MUCNUOCHO",
    "timestamp": "2024-09-11T08:00:00.000Z",
    "value": 12.45,
    "dataSource": "realtime"
  }
}
```

#### `GET /api/forecast/data/:stationUuid/:parameterType/statistics`
Lấy thống kê dữ liệu

**Query Parameters:**
- `startDate` (optional): Ngày bắt đầu thống kê
- `endDate` (optional): Ngày kết thúc thống kê

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRecords": 720,
    "realtimeRecords": 480,
    "forecastRecords": 240,
    "minValue": 8.5,
    "maxValue": 15.2,
    "avgValue": 11.8,
    "dataCompleteness": 95.5
  }
}
```

---

## ⏰ Scheduler tự động

Hệ thống tự động chạy các schedulers:

### 📅 Lịch trình mặc định

| Scheduler | Tần suất | Mô tả |
|-----------|----------|-------|
| **Hourly Sync** | `0 * * * *` | Sync mỗi giờ cho parameter quan trọng (MUCNUOCHO) |
| **Comprehensive Sync** | `0 */4 * * *` | Sync toàn diện mỗi 4 giờ cho tất cả parameters |
| **Daily Cleanup** | `0 2 * * *` | Dọn dẹp dữ liệu cũ hàng ngày lúc 02:00 |
| **Health Check** | `*/30 * * * *` | Kiểm tra sức khỏe hệ thống mỗi 30 phút |

### 🔧 Cấu hình Scheduler

Schedulers được khởi tạo tự động khi server start. Kiểm tra log:

```
📊 Khởi tạo Forecast Data Scheduler...
✅ Started hourlySync scheduler
✅ Started fourHourlySync scheduler  
✅ Started dailyCleanup scheduler
✅ Started healthCheck scheduler
✅ All forecast schedulers started
```

---

## 🔗 Tích hợp với SWMM Service

### Lấy dữ liệu từ Backend cho SWMM

SWMM service có thể gọi API để lấy dữ liệu:

```javascript
// Trong swmm-service
const axios = require('axios');

async function fetchForecastDataForSWMM() {
    const response = await axios.get(
        'http://localhost:5000/api/forecast/data/613bbcf5-212e-43c5-9ef8-69016787454f/MUCNUOCHO/latest'
    );
    
    return response.data;
}
```

### Tích hợp vào SWMM Data Service

Cập nhật `swmm-service/app/services/data_service.py`:

```python
# Thêm vào fetch_ho_dau_tieng_forecast_data method
async def fetch_ho_dau_tieng_forecast_data(self, start_date, end_date):
    try:
        # Gọi backend Node.js thay vì gọi trực tiếp API nguồn
        backend_url = f"{self.backend_url}/api/forecast/data/613bbcf5-212e-43c5-9ef8-69016787454f/MUCNUOCHO"
        
        params = {
            'startDate': start_date.isoformat(),
            'endDate': end_date.isoformat(),
            'dataSource': 'forecast',
            'limit': 1000
        }
        
        response = await httpx.get(backend_url, params=params)
        data = response.json()
        
        if data['success']:
            # Convert data format cho SWMM
            return self._convert_forecast_data_for_swmm(data['data']['data'])
        else:
            logger.error(f"Backend forecast API error: {data.get('message')}")
            return []
            
    except Exception as e:
        logger.error(f"Error fetching forecast data from backend: {e}")
        return []
```

---

## 🗄️ Database Schema

### Collection: `forecaststations`

```javascript
{
  _id: ObjectId,
  stationId: String,
  stationUuid: String,
  stationName: String,
  location: {
    latitude: Number,
    longitude: Number
  },
  administrativeInfo: {
    province: String,
    district: String,
    riverSystem: String
  },
  status: String, // 'active', 'inactive', 'maintenance'
  supportedParameters: [{
    parameterCode: String,
    parameterName: String,
    unit: String,
    minValue: Number,
    maxValue: Number
  }],
  apiConfig: {
    fetchInterval: Number,
    forecastDays: Number,
    autoSync: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Collection: `forecastdatas`

```javascript
{
  _id: ObjectId,
  stationUuid: String,
  parameterType: String, // 'MUCNUOCHO', 'QDEN', 'QXA', 'RAINFALL'
  timestamp: Date,
  value: Number,
  dataSource: String, // 'realtime', 'forecast', 'manual'
  qualityInfo: {
    qualityFlag: String,
    confidence: Number
  },
  forecastInfo: {
    forecastHorizon: Number, // hours ahead
    forecastModel: String,
    forecastDate: Date
  },
  metadata: {
    rawValue: Number,
    unit: String
  },
  createdAt: Date
}
```

---

## 🔧 Cấu hình môi trường

Thêm vào `.env` file:

```env
# Forecast API Settings
FORECAST_INITIAL_SYNC=true
FORECAST_AUTO_START=true
FORECAST_LOG_LEVEL=info

# Database
MONGO_URI=mongodb://localhost:27017/hydrology_dashboard

# API Settings  
NODE_ENV=development
PORT=5000
```

---

## 🐛 Troubleshooting

### Lỗi thường gặp

#### 1. **Connection Error**
```
❌ Error fetching forecast data: connect ECONNREFUSED
```
**Giải pháp:** Kiểm tra API Hồ Dầu Tiếng có hoạt động

#### 2. **Database Error**
```
❌ MongoError: collection validation failed
```
**Giải pháp:** Kiểm tra MongoDB connection và schema

#### 3. **Scheduler Not Working**
```
⚠️ Sync already in progress, skipping hourly sync
```
**Giải pháp:** Bình thường, scheduler sẽ skip nếu đang chạy

### Debug Mode

Bật debug logs:

```bash
NODE_ENV=development npm start
```

### Manual Testing

Test manual sync:

```bash
curl -X POST http://localhost:5000/api/forecast/sync-all
```

---

## 📈 Monitoring

### Health Check Endpoints

- `GET /api/forecast/health` - Service health
- `GET /api/forecast/stations` - Kiểm tra trạm active
- `GET /api/forecast/data/.../statistics` - Thống kê dữ liệu

### Log Monitoring

```bash
# Theo dõi logs
tail -f debug.log | grep "forecast"

# Scheduler logs
tail -f debug.log | grep "🔄\|✅\|❌"
```

---

## 🚀 Deployment Notes

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure MongoDB replica set
- [ ] Set up monitoring alerts
- [ ] Configure log rotation
- [ ] Set API rate limiting
- [ ] Enable HTTPS
- [ ] Configure backup strategies

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'hydrology-backend',
    script: 'src/server.js',
    env: {
      NODE_ENV: 'production',
      FORECAST_AUTO_START: 'true'
    }
  }]
}
```

---

## 🤝 Support

Để được hỗ trợ:

1. Kiểm tra logs: `tail -f debug.log`
2. Test health endpoint: `curl /api/forecast/health`
3. Kiểm tra database connection
4. Xem documentation này

**Contact:** Hydrology Team