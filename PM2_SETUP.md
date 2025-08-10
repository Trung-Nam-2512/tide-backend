# 🔄 Hướng dẫn Chạy Backend Liên tục với PM2

## 📋 PM2 là gì?

PM2 là một Process Manager cho Node.js giúp:

- ✅ Chạy ứng dụng liên tục 24/7
- ✅ Tự động restart khi crash
- ✅ Quản lý logs
- ✅ Monitor performance
- ✅ Load balancing
- ✅ Zero-downtime deployment

## 🚀 Cài đặt và Cấu hình PM2

### Bước 1: Cài đặt PM2

```bash
# Cài đặt PM2 globally
sudo npm install -g pm2

# Kiểm tra phiên bản
pm2 --version
```

### Bước 2: Tạo file cấu hình PM2

```bash
# Tạo file ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'hydrology-backend',
    script: 'src/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Tạo thư mục logs
mkdir -p logs
```

### Bước 3: Khởi động ứng dụng với PM2

```bash
# Khởi động với file config
pm2 start ecosystem.config.js

# Hoặc khởi động trực tiếp
pm2 start src/server.js --name "hydrology-backend"

# Khởi động với production mode
pm2 start ecosystem.config.js --env production
```

### Bước 4: Cấu hình PM2 Startup

```bash
# Lưu cấu hình hiện tại
pm2 save

# Tạo startup script
pm2 startup

# Copy lệnh được tạo ra và chạy với sudo
# Ví dụ: sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

## 📊 Quản lý PM2

### Các lệnh cơ bản

```bash
# Xem danh sách ứng dụng
pm2 list
pm2 status

# Restart ứng dụng
pm2 restart hydrology-backend
pm2 restart all

# Stop ứng dụng
pm2 stop hydrology-backend
pm2 stop all

# Start ứng dụng
pm2 start hydrology-backend
pm2 start all

# Delete ứng dụng
pm2 delete hydrology-backend
pm2 delete all

# Reload ứng dụng (zero-downtime)
pm2 reload hydrology-backend
```

### Xem logs

```bash
# Xem logs real-time
pm2 logs hydrology-backend
pm2 logs --lines 100

# Xem logs cụ thể
pm2 logs hydrology-backend --err
pm2 logs hydrology-backend --out

# Xem logs từ file
tail -f logs/combined.log
tail -f logs/err.log
tail -f logs/out.log
```

### Monitor performance

```bash
# Monitor real-time
pm2 monit

# Xem thông tin chi tiết
pm2 show hydrology-backend

# Xem thống kê
pm2 stats
```

## 🔧 Cấu hình Nâng cao

### File ecosystem.config.js chi tiết

```javascript
module.exports = {
  apps: [{
    name: 'hydrology-backend',
    script: 'src/server.js',
    instances: 'max', // Sử dụng tất cả CPU cores
    exec_mode: 'cluster', // Chế độ cluster
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 5000,
      MONGO_URI: 'mongodb://localhost:27017/project-water-level-forecast'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      MONGO_URI: 'mongodb://localhost:27017/project-water-level-forecast'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    log_type: 'json',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 8000
  }]
};
```

### Cấu hình Load Balancing

```bash
# Khởi động với nhiều instances
pm2 start ecosystem.config.js -i max

# Hoặc chỉ định số instances
pm2 start ecosystem.config.js -i 4
```

## 🔄 Deployment Script

### Tạo script deploy.sh

```bash
#!/bin/bash

# Script deploy và restart backend

echo "🚀 Deploying Hydrology Backend..."

# Pull code mới
git pull origin main

# Cài đặt dependencies
npm install --production

# Restart ứng dụng
pm2 restart hydrology-backend

# Kiểm tra trạng thái
pm2 status

echo "✅ Deployment completed!"
```

### Sử dụng script

```bash
chmod +x deploy.sh
./deploy.sh
```

## 🔍 Monitoring và Alerts

### Cấu hình monitoring

```bash
# Cài đặt PM2 Plus (optional)
pm2 install pm2-server-monit

# Cấu hình alerts
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### Script kiểm tra health

```bash
#!/bin/bash

# Script kiểm tra health của backend

HEALTH_URL="http://localhost:5000/api/v1/health"
MAX_RETRIES=3
RETRY_DELAY=5

for i in $(seq 1 $MAX_RETRIES); do
    if curl -f -s $HEALTH_URL > /dev/null; then
        echo "✅ Backend is healthy"
        exit 0
    else
        echo "❌ Backend health check failed (attempt $i/$MAX_RETRIES)"
        if [ $i -lt $MAX_RETRIES ]; then
            sleep $RETRY_DELAY
        fi
    fi
done

echo "🚨 Backend is not responding, restarting..."
pm2 restart hydrology-backend
```

## 🚨 Troubleshooting

### Nếu PM2 không start

```bash
# Kiểm tra logs
pm2 logs hydrology-backend

# Kiểm tra process
ps aux | grep node

# Kiểm tra port
sudo netstat -tlnp | grep :5000

# Restart PM2 daemon
pm2 kill
pm2 resurrect
```

### Nếu ứng dụng crash liên tục

```bash
# Xem logs lỗi
pm2 logs hydrology-backend --err

# Kiểm tra memory
pm2 monit

# Restart với debug mode
pm2 restart hydrology-backend --update-env
```

### Nếu startup script không hoạt động

```bash
# Tạo lại startup script
pm2 unstartup
pm2 startup

# Kiểm tra systemd service
sudo systemctl status pm2-ubuntu
```

## 📝 Các lệnh hữu ích

```bash
# Backup PM2 configuration
pm2 save

# Restore PM2 configuration
pm2 resurrect

# Update PM2
pm2 update

# Xem thông tin chi tiết
pm2 show hydrology-backend

# Xem logs với timestamp
pm2 logs hydrology-backend --timestamp

# Monitor CPU/Memory
pm2 monit

# Flush logs
pm2 flush

# Reload với zero-downtime
pm2 reload hydrology-backend
```

## ✅ Kết quả

Sau khi cấu hình PM2:

- ✅ Backend chạy liên tục 24/7
- ✅ Tự động restart khi crash
- ✅ Logs được quản lý tự động
- ✅ Performance monitoring
- ✅ Zero-downtime deployment
- ✅ Load balancing (nếu cần)

**Backend sẽ luôn sẵn sàng tại:**

- `http://your-server-ip:5000`
- `http://your-server-ip/api/v1/health`
