# 🚀 PRODUCTION MIGRATION GUIDE

## Tổng quan

Hướng dẫn chuyển đổi dữ liệu từ `binhduongstations` (old schema) sang V2 schema trên production.

## 📋 Các bước thực hiện

### 1. Backup dữ liệu (BẮT BUỘC)

```bash
cd backend
node scripts/backup-before-migration.js
```

**Kết quả**: Tạo file backup `backup_old_schema_*.json` và `backup_v2_schema_*.json`

### 2. Chạy migration

```bash
cd backend
node scripts/production-migration.js
```

**Kết quả**:

- Chuyển đổi tất cả dữ liệu từ old schema sang V2 schema
- Tạo metadata, current data, và timeseries buckets
- Preserve dữ liệu cũ

### 3. Verify migration

```bash
cd backend
node scripts/verify-migration.js
```

**Kết quả**: Kiểm tra tính toàn vẹn dữ liệu và API endpoints

## 📊 Cấu trúc dữ liệu sau migration

### Old Schema (binhduongstations)

```
1 document/station
├── history: [83 entries] // Có thể vượt 16MB
└── currentData: {...}
```

### V2 Schema

```
Station Metadata (6 documents)
├── station_metadata_v2: 6 documents
├── current_data_v2: 6 documents  
└── timeseries_buckets_v2: 12+ documents (1/ngày/station)
```

## ⚠️ Lưu ý quan trọng

1. **Backup bắt buộc**: Luôn backup trước khi migration
2. **Downtime**: Migration có thể mất 5-10 phút
3. **Data preservation**: Dữ liệu cũ được giữ nguyên
4. **API compatibility**: 100% tương thích với frontend

## 🔧 Troubleshooting

### Lỗi "Station already exists"

- V2 schema đã có dữ liệu
- Migration sẽ skip stations đã tồn tại
- An toàn để chạy lại

### Lỗi "MongoDB connection"

- Kiểm tra MongoDB đang chạy
- Kiểm tra connection string trong config

### Lỗi "API not responding"

- Kiểm tra server đang chạy
- Kiểm tra port 1423

## 📈 Kết quả mong đợi

### Trước migration

- Old schema: 6 stations với 83+ history entries
- V2 schema: 0 hoặc ít data

### Sau migration

- Old schema: 6 stations (giữ nguyên)
- V2 schema: 6 stations với 500+ measurements
- API: Hoạt động với V2 service
- Performance: Cải thiện đáng kể

## 🎯 Rollback (nếu cần)

Nếu có vấn đề, có thể rollback:

1. Dừng server
2. Restore từ backup files
3. Restart server

## ✅ Checklist

- [ ] Backup dữ liệu
- [ ] Chạy migration
- [ ] Verify migration
- [ ] Test API endpoints
- [ ] Test frontend
- [ ] Monitor performance

## 📞 Support

Nếu gặp vấn đề, kiểm tra:

1. Logs của migration script
2. MongoDB connection
3. API response
4. Frontend console errors
