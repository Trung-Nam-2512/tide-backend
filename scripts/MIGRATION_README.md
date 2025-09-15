# Binh Duong Data Migration Guide

## Tổng quan

Script migration này được thiết kế để chuyển đổi dữ liệu từ cấu trúc cũ (`binhduongstations`) sang cấu trúc mới (3-tier schema) để giải quyết vấn đề MongoDB 16MB document limit.

## Cấu trúc mới

### 1. Station Metadata (`station_metadata_v2`)

- Thông tin tĩnh của trạm
- Không chứa timeseries data

### 2. Current Data (`current_data_v2`)

- Dữ liệu mới nhất của mỗi trạm
- Cập nhật theo thời gian thực

### 3. Timeseries Buckets (`timeseries_buckets_v2`)

- Dữ liệu lịch sử được nhóm theo ngày
- Mỗi bucket chứa tối đa 48 measurements (30 phút/entry)

## Scripts có sẵn

### 1. `check-production-data.js`

Kiểm tra cấu trúc dữ liệu production trước khi migration.

```bash
node scripts/check-production-data.js
```

### 2. `backup-before-migration.js`

Tạo backup dữ liệu trước khi migration.

```bash
# Tạo backup
node scripts/backup-before-migration.js

# Restore từ backup
node scripts/backup-before-migration.js restore "path/to/backup.json"
```

### 3. `migrate-binhduong-data.js`

Thực hiện migration dữ liệu.

```bash
node scripts/migrate-binhduong-data.js
```

### 4. `test-migration.js`

Test migration với dữ liệu mẫu.

```bash
node scripts/test-migration.js
```

### 5. `run-production-migration.js`

Chạy migration production với kiểm tra đầy đủ.

```bash
node scripts/run-production-migration.js
```

### 6. `migration-workflow.js`

Workflow hoàn chỉnh: backup → check → migrate → verify.

```bash
node scripts/migration-workflow.js
```

### 7. `test-api-endpoints.js`

Kiểm tra API endpoints sau migration.

```bash
node scripts/test-api-endpoints.js
```

## Quy trình migration

### Bước 1: Chuẩn bị

```bash
# 1. Kiểm tra dữ liệu production
node scripts/check-production-data.js

# 2. Test migration với dữ liệu mẫu
node scripts/test-migration.js
```

### Bước 2: Backup

```bash
# Tạo backup dữ liệu
node scripts/backup-before-migration.js
```

### Bước 3: Migration

```bash
# Chạy migration workflow hoàn chỉnh
node scripts/migration-workflow.js

# Hoặc chạy từng bước riêng lẻ
node scripts/migrate-binhduong-data.js
```

### Bước 4: Kiểm tra

```bash
# Test API endpoints
node scripts/test-api-endpoints.js

# Test frontend
# Mở trình duyệt và kiểm tra dashboard
```

## Lưu ý quan trọng

### ⚠️ Cảnh báo

- Migration sẽ **XÓA** tất cả dữ liệu V2 hiện có
- Luôn tạo backup trước khi migration
- Test trên môi trường development trước

### ✅ Đảm bảo

- API endpoints vẫn hoạt động bình thường
- Frontend không cần thay đổi
- Dữ liệu được chuyển đổi chính xác
- Performance được cải thiện

### 🔧 Troubleshooting

#### Lỗi kết nối MongoDB

```bash
# Kiểm tra MongoDB đang chạy
mongosh --eval "db.adminCommand('ping')"
```

#### Lỗi memory

```bash
# Tăng memory limit cho Node.js
node --max-old-space-size=4096 scripts/migrate-binhduong-data.js
```

#### Lỗi timeout

```bash
# Tăng timeout cho MongoDB
# Trong config: { serverSelectionTimeoutMS: 30000 }
```

## Cấu trúc dữ liệu

### Old Schema (binhduongstations)

```javascript
{
  key: String,
  name: String,
  currentData: {
    receivedAt: Date,
    measuringLogs: Object
  },
  history: [{
    timestamp: Date,
    measuringLogs: Object
  }]
}
```

### New Schema (3-tier)

#### Station Metadata

```javascript
{
  key: String,
  name: String,
  address: String,
  mapLocation: Object,
  province: Object,
  stationType: Object,
  status: String
}
```

#### Current Data

```javascript
{
  stationKey: String,
  receivedAt: Date,
  data: Object,
  rawData: Object,
  status: String
}
```

#### Timeseries Bucket

```javascript
{
  stationKey: String,
  bucketDate: Date,
  measurements: [{
    timestamp: Date,
    data: Object,
    quality: String
  }],
  count: Number,
  stats: Object
}
```

## Performance Benefits

### Trước migration

- ❌ Document size có thể vượt 16MB
- ❌ Query chậm với history lớn
- ❌ Memory usage cao
- ❌ Index không hiệu quả

### Sau migration

- ✅ Document size luôn < 16MB
- ✅ Query nhanh với bucket-based
- ✅ Memory usage tối ưu
- ✅ Index hiệu quả theo ngày
- ✅ Compression và archiving
- ✅ Scalability tốt hơn

## Monitoring

### Kiểm tra sau migration

1. **API Response Time**: < 500ms
2. **Memory Usage**: < 1GB
3. **Database Size**: Giảm 30-50%
4. **Query Performance**: Cải thiện 2-3x

### Metrics quan trọng

- Số lượng stations migrated
- Số lượng timeseries buckets tạo
- Thời gian migration
- Kích thước backup file
- API response times

## Rollback Plan

Nếu có vấn đề sau migration:

```bash
# 1. Restore từ backup
node scripts/backup-before-migration.js restore "backup-file.json"

# 2. Restart server
pm2 restart hydrology-dashboard

# 3. Verify system
node scripts/test-api-endpoints.js
```

## Support

Nếu gặp vấn đề:

1. Kiểm tra logs trong `debug.log`
2. Chạy `test-api-endpoints.js` để debug
3. Restore từ backup nếu cần
4. Liên hệ team development
