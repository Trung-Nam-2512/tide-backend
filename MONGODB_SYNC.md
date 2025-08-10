# 🔄 Hướng dẫn Đồng bộ MongoDB từ Local lên Server

## 📋 Yêu cầu

- MongoDB đã cài đặt trên cả local và server
- Kết nối SSH đến server
- Dữ liệu MongoDB trên máy local

## 🚀 Phương pháp 1: Sử dụng mongodump/mongorestore

### Bước 1: Backup dữ liệu từ Local

```bash
# Tạo thư mục backup
mkdir -p ~/mongodb-backup

# Backup toàn bộ database
mongodump --db project-water-level-forecast --out ~/mongodb-backup

# Hoặc backup collection cụ thể
mongodump --db project-water-level-forecast --collection tides --out ~/mongodb-backup

# Kiểm tra file backup
ls -la ~/mongodb-backup/project-water-level-forecast/
```

### Bước 2: Copy dữ liệu lên Server

```bash
# Copy qua SCP (thay your-server-ip)
scp -r ~/mongodb-backup/project-water-level-forecast/ username@your-server-ip:/tmp/

# Hoặc sử dụng rsync
rsync -avz ~/mongodb-backup/project-water-level-forecast/ username@your-server-ip:/tmp/
```

### Bước 3: Restore dữ liệu trên Server

```bash
# SSH vào server
ssh username@your-server-ip

# Restore dữ liệu
mongorestore --db project-water-level-forecast /tmp/project-water-level-forecast/

# Kiểm tra dữ liệu
mongo project-water-level-forecast --eval "db.tides.count()"
```

## 🔧 Phương pháp 2: Sử dụng mongoexport/mongoimport

### Bước 1: Export dữ liệu từ Local

```bash
# Export collection tides
mongoexport --db project-water-level-forecast --collection tides --out ~/tides.json

# Export với format khác
mongoexport --db project-water-level-forecast --collection tides --out ~/tides.csv --type=csv --fields=date,tide,location

# Export với query filter
mongoexport --db project-water-level-forecast --collection tides --query='{"date": {"$gte": {"$date": "2024-01-01T00:00:00Z"}}}' --out ~/tides-2024.json
```

### Bước 2: Copy và Import lên Server

```bash
# Copy file
scp ~/tides.json username@your-server-ip:/tmp/

# SSH vào server và import
ssh username@your-server-ip
mongoimport --db project-water-level-forecast --collection tides --file /tmp/tides.json
```

## 🔄 Phương pháp 3: Script Tự động Đồng bộ

### Tạo script sync-mongodb.sh

```bash
#!/bin/bash

# Script đồng bộ MongoDB từ Local lên Server
# Sử dụng: ./sync-mongodb.sh your-server-ip username

SERVER_IP=$1
USERNAME=$2
DB_NAME="project-water-level-forecast"
BACKUP_DIR="~/mongodb-backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🔄 Starting MongoDB sync to $SERVER_IP..."

# Tạo backup
echo "📦 Creating backup..."
mongodump --db $DB_NAME --out $BACKUP_DIR

# Tạo archive
echo "📦 Creating archive..."
tar -czf ~/mongodb-backup-$TIMESTAMP.tar.gz -C ~/mongodb-backup .

# Copy lên server
echo "📤 Copying to server..."
scp ~/mongodb-backup-$TIMESTAMP.tar.gz $USERNAME@$SERVER_IP:/tmp/

# Restore trên server
echo "📥 Restoring on server..."
ssh $USERNAME@$SERVER_IP << EOF
    cd /tmp
    tar -xzf mongodb-backup-$TIMESTAMP.tar.gz
    mongorestore --db $DB_NAME project-water-level-forecast/
    rm -rf project-water-level-forecast mongodb-backup-$TIMESTAMP.tar.gz
    echo "✅ Sync completed!"
EOF

# Cleanup local
rm -rf ~/mongodb-backup ~/mongodb-backup-$TIMESTAMP.tar.gz

echo "🎉 MongoDB sync completed!"
```

### Sử dụng script

```bash
chmod +x sync-mongodb.sh
./sync-mongodb.sh your-server-ip username
```

## 🔄 Phương pháp 4: Đồng bộ Real-time với MongoDB Replica Set

### Bước 1: Cấu hình Replica Set trên Local

```bash
# Tạo file config
cat > mongod.conf << EOF
replication:
  replSetName: "hydrology-replica"
net:
  port: 27017
  bindIp: 0.0.0.0
EOF

# Khởi động MongoDB với config
mongod --config mongod.conf
```

### Bước 2: Khởi tạo Replica Set

```bash
# Kết nối mongo shell
mongo

# Khởi tạo replica set
rs.initiate({
  _id: "hydrology-replica",
  members: [
    { _id: 0, host: "localhost:27017" },
    { _id: 1, host: "your-server-ip:27017" }
  ]
})
```

### Bước 3: Cấu hình Server

```bash
# Trên server, tạo file config tương tự
sudo tee /etc/mongod.conf << EOF
replication:
  replSetName: "hydrology-replica"
net:
  port: 27017
  bindIp: 0.0.0.0
storage:
  dbPath: /var/lib/mongodb
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
EOF

# Restart MongoDB
sudo systemctl restart mongod
```

## 📊 Phương pháp 5: Sử dụng MongoDB Compass (GUI)

### Bước 1: Export từ Compass

1. Mở MongoDB Compass
2. Kết nối đến database local
3. Chọn collection `tides`
4. Click "Export Collection"
5. Chọn format JSON hoặc CSV
6. Lưu file

### Bước 2: Import vào Server

1. Kết nối Compass đến server MongoDB
2. Chọn database `project-water-level-forecast`
3. Click "Add Data" > "Import File"
4. Chọn file đã export
5. Import dữ liệu

## 🔧 Script Kiểm tra Đồng bộ

```bash
#!/bin/bash

# Script kiểm tra dữ liệu trên cả local và server

LOCAL_COUNT=$(mongo project-water-level-forecast --quiet --eval "db.tides.count()")
SERVER_COUNT=$(ssh username@your-server-ip "mongo project-water-level-forecast --quiet --eval 'db.tides.count()'")

echo "📊 Data comparison:"
echo "Local: $LOCAL_COUNT documents"
echo "Server: $SERVER_COUNT documents"

if [ "$LOCAL_COUNT" -eq "$SERVER_COUNT" ]; then
    echo "✅ Sync successful!"
else
    echo "❌ Sync failed or incomplete"
fi
```

## 🚨 Troubleshooting

### Nếu mongodump lỗi

```bash
# Kiểm tra kết nối MongoDB
mongo --eval "db.adminCommand('ping')"

# Kiểm tra quyền
mongo --eval "db.runCommand({connectionStatus : 1})"
```

### Nếu scp lỗi

```bash
# Kiểm tra kết nối SSH
ssh -T username@your-server-ip

# Kiểm tra disk space trên server
ssh username@your-server-ip "df -h"
```

### Nếu mongorestore lỗi

```bash
# Kiểm tra MongoDB service trên server
ssh username@your-server-ip "sudo systemctl status mongod"

# Kiểm tra disk space
ssh username@your-server-ip "df -h /var/lib/mongodb"
```

## 📝 Lệnh hữu ích

```bash
# Kiểm tra kích thước database
mongo project-water-level-forecast --eval "db.stats()"

# Kiểm tra collections
mongo project-water-level-forecast --eval "show collections"

# Backup với compression
mongodump --db project-water-level-forecast --gzip --out ~/mongodb-backup

# Restore với compression
mongorestore --gzip --db project-water-level-forecast ~/mongodb-backup/project-water-level-forecast/
```

## ✅ Kết quả

Sau khi đồng bộ thành công:

- ✅ Dữ liệu MongoDB từ local đã được copy lên server
- ✅ Database `project-water-level-forecast` có đầy đủ collections
- ✅ Backend API có thể truy cập dữ liệu
- ✅ Frontend có thể kết nối và hiển thị dữ liệu
