#!/bin/bash

# 🔧 Script để sửa lỗi MongoDB Authentication
# Chạy trên server Ubuntu

set -e

echo "🔧 Fixing MongoDB authentication issue..."

# Bước 1: Dừng MongoDB
echo "🛑 Stopping MongoDB..."
sudo systemctl stop mongod

# Bước 2: Backup config hiện tại
echo "📦 Backing up current config..."
sudo cp /etc/mongod.conf /etc/mongod.conf.backup.$(date +%Y%m%d_%H%M%S)

# Bước 3: Tạo config mới không có authentication
echo "⚙️ Creating new MongoDB config..."
sudo tee /etc/mongod.conf << EOF
# network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1

# where to write logging data.
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

# Where and how to store data.
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

# Disable authentication for development
security:
  authorization: disabled

# operationProfiling:
operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100

# replication:
# replication:
#   replSetName: "rs0"
EOF

# Bước 4: Khởi động lại MongoDB
echo "🚀 Starting MongoDB..."
sudo systemctl start mongod
sudo systemctl enable mongod

# Bước 5: Kiểm tra trạng thái
echo "✅ Checking MongoDB status..."
sleep 3
sudo systemctl status mongod --no-pager

# Bước 6: Test kết nối
echo "🔍 Testing MongoDB connection..."
if mongo --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "✅ MongoDB connection successful!"
else
    echo "❌ MongoDB connection failed!"
    exit 1
fi

# Bước 7: Tạo database nếu chưa có
echo "📊 Creating database if not exists..."
mongo --eval "
  use project-water-level-forecast;
  db.createCollection('tides');
  print('Database and collection created successfully');
"

echo "🎉 MongoDB authentication fix completed!"
echo "📝 You can now restart your backend application:"
echo "   pm2 restart hydrology-backend" 