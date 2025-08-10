# Scripts để cập nhật dữ liệu Vũng Tàu

## Tổng quan

Các script này được tạo để cập nhật giá trị đo của trạm Vũng Tàu trong database, trừ đi 2.885 từ tất cả các giá trị `waterLevel` để đảm bảo độ chính xác.

## Các script có sẵn

### 1. Backup dữ liệu Vũng Tàu

```bash
npm run backup-vungtau-data
```

**Chức năng:**

- Backup tất cả dữ liệu hiện tại của trạm Vũng Tàu
- Lưu file backup vào thư mục `backups/` với timestamp
- Hiển thị thống kê dữ liệu

**Output:**

```
🚀 Bắt đầu backup dữ liệu Vũng Tàu
==================================================
🔄 Bắt đầu backup dữ liệu Vũng Tàu...
📍 Station Code: 4EC7BBAF-44E7-4DFA-BAED-4FB1217FBDA8
📊 Tìm thấy 1500 records của trạm Vũng Tàu
✅ Đã backup thành công: /path/to/backups/vungtau-backup-2024-01-15T10-30-00-000Z.json
```

### 2. Cập nhật dữ liệu Vũng Tàu

```bash
npm run update-vungtau-data
```

**Chức năng:**

- Cập nhật tất cả giá trị `waterLevel` của trạm Vũng Tàu (trừ 2.885)
- Sử dụng bulk update để tối ưu hiệu suất
- Hiển thị thống kê sau khi cập nhật

**Output:**

```
🚀 Bắt đầu script cập nhật dữ liệu Vũng Tàu
==================================================
🔄 Bắt đầu cập nhật dữ liệu Vũng Tàu...
📍 Station Code: 4EC7BBAF-44E7-4DFA-BAED-4FB1217FBDA8
🔧 Giá trị điều chỉnh: -2.885
📊 Tìm thấy 1500 records của trạm Vũng Tàu

📊 Kết quả cập nhật:
✅ Đã cập nhật thành công: 1500 records
📈 Tổng số records: 1500
```

### 3. Backup và cập nhật (Khuyến nghị)

```bash
npm run backup-and-update-vungtau
```

**Chức năng:**

- Backup dữ liệu trước khi cập nhật
- Cập nhật dữ liệu sau khi backup thành công
- An toàn nhất vì có backup trước khi thay đổi

**Output:**

```
🚀 Script backup và cập nhật dữ liệu Vũng Tàu
======================================================================
📍 Station Code: 4EC7BBAF-44E7-4DFA-BAED-4FB1217FBDA8
🔧 Giá trị điều chỉnh: -2.885
======================================================================

📦 Bước 1: Backup dữ liệu hiện tại...
✅ Backup hoàn thành: /path/to/backups/vungtau-backup-2024-01-15T10-30-00-000Z.json

🔄 Bước 2: Cập nhật dữ liệu...
✅ Cập nhật hoàn thành

🎉 Hoàn thành tất cả các bước!
```

## Thông tin kỹ thuật

### Station Code

- **Vũng Tàu**: `4EC7BBAF-44E7-4DFA-BAED-4FB1217FBDA8`

### Giá trị điều chỉnh

- **Giá trị trừ**: `2.885`
- **Đơn vị**: `cm`

### Cấu trúc file backup

```json
{
  "metadata": {
    "stationCode": "4EC7BBAF-44E7-4DFA-BAED-4FB1217FBDA8",
    "backupTime": "2024-01-15T10:30:00.000Z",
    "totalRecords": 1500,
    "description": "Backup dữ liệu Vũng Tàu trước khi cập nhật (trừ 2.885)"
  },
  "data": [
    {
      "_id": "...",
      "stationCode": "4EC7BBAF-44E7-4DFA-BAED-4FB1217FBDA8",
      "waterLevel": 150.5,
      "timestamp": 1705312200000,
      "utc": "2024-01-15T03:30:00.000Z",
      "vietnamTime": "15/01/2024 10:30:00",
      "unit": "cm",
      "dataType": "real",
      "status": "active"
    }
  ]
}
```

## Lưu ý quan trọng

1. **Backup trước khi cập nhật**: Luôn chạy backup trước khi cập nhật để có thể khôi phục nếu cần
2. **Kiểm tra dữ liệu**: Sau khi cập nhật, kiểm tra lại dữ liệu để đảm bảo tính chính xác
3. **Thời gian chạy**: Script có thể mất vài phút tùy thuộc vào số lượng dữ liệu
4. **Quyền truy cập**: Đảm bảo có quyền ghi vào thư mục `backups/`

## Khôi phục dữ liệu (nếu cần)

Nếu cần khôi phục dữ liệu từ backup, sử dụng script sau:

```javascript
// Tạo script restore (nếu cần)
const backupData = require('./backups/vungtau-backup-2024-01-15T10-30-00-000Z.json');

// Restore logic sẽ được thêm vào đây nếu cần
```

## Hỗ trợ

Nếu gặp vấn đề, kiểm tra:

1. Kết nối database
2. Quyền truy cập file
3. Log lỗi trong console
4. Dung lượng ổ đĩa cho backup
