# 🚀 Hướng dẫn Deploy Backend lên Ubuntu Server

## 📋 Yêu cầu hệ thống
- Ubuntu 20.04 LTS hoặc mới hơn
- 1GB RAM tối thiểu
- 10GB disk space
- Quyền sudo

## 🔧 Bước 1: Cập nhật hệ thống

```bash
# Cập nhật package list
sudo apt update
sudo apt upgrade -y

# Cài đặt các package cần thiết
sudo apt install -y curl wget git build-essential
```

## 🐍 Bước 2: Cài đặt Node.js

```bash
# Thêm NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Cài đặt Node.js
sudo apt install -y nodejs

# Kiểm tra phiên bản
node --version
npm --version
```

## 🍃 Bước 3: Cài đặt MongoDB

```bash
# Import MongoDB GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Thêm MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Cập nhật package list
sudo apt update

# Cài đặt MongoDB
sudo apt install -y mongodb-org

# Khởi động MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Kiểm tra trạng thái
sudo systemctl status mongod
```

## 📁 Bước 4: Clone và cài đặt Backend

```bash
# Tạo thư mục cho ứng dụng
sudo mkdir -p /var/www/hydrology-backend
sudo chown $USER:$USER /var/www/hydrology-backend

# Clone repository
cd /var/www/hydrology-backend
git clone https://github.com/Trung-Nam-2512/tide-backend.git .

# Cài đặt dependencies
npm install --production
```

## 🔐 Bước 5: Cấu hình Environment Variables

```bash
# Tạo file .env
cat > .env << EOF
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://localhost:27017/project-water-level-forecast
EOF

# Đặt quyền cho file .env
chmod 600 .env
```

## 🔄 Bước 6: Cài đặt PM2 (Process Manager)

```bash
# Cài đặt PM2 globally
sudo npm install -g pm2

# Khởi động ứng dụng với PM2
pm2 start src/server.js --name "hydrology-backend"

# Lưu cấu hình PM2
pm2 save
pm2 startup

# Kiểm tra trạng thái
pm2 status
pm2 logs hydrology-backend
```

## 🌐 Bước 7: Cấu hình Nginx (Reverse Proxy)

```bash
# Cài đặt Nginx
sudo apt install -y nginx

# Tạo cấu hình Nginx
sudo tee /etc/nginx/sites-available/hydrology-backend << EOF
server {
    listen 80;
    server_name your-domain.com;  # Thay đổi thành domain của bạn

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Kích hoạt site
sudo ln -s /etc/nginx/sites-available/hydrology-backend /etc/nginx/sites-enabled/

# Kiểm tra cấu hình Nginx
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔒 Bước 8: Cấu hình Firewall

```bash
# Cài đặt UFW
sudo apt install -y ufw

# Cấu hình firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Kiểm tra trạng thái
sudo ufw status
```

## 📊 Bước 9: Monitoring và Logs

```bash
# Xem logs PM2
pm2 logs hydrology-backend

# Xem logs Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Monitor system resources
pm2 monit
```

## 🔧 Bước 10: Cập nhật ứng dụng

```bash
# Pull code mới
cd /var/www/hydrology-backend
git pull origin main

# Cài đặt dependencies mới (nếu có)
npm install --production

# Restart ứng dụng
pm2 restart hydrology-backend
```

## 🧪 Bước 11: Kiểm tra API

```bash
# Test health endpoint
curl http://localhost:5000/api/v1/health

# Test root endpoint
curl http://localhost:5000/

# Test từ bên ngoài (thay your-domain.com)
curl http://your-domain.com/api/v1/health
```

## 📝 Các lệnh hữu ích

```bash
# Restart ứng dụng
pm2 restart hydrology-backend

# Stop ứng dụng
pm2 stop hydrology-backend

# Start ứng dụng
pm2 start hydrology-backend

# Xem logs real-time
pm2 logs hydrology-backend --lines 100

# Monitor resources
pm2 monit

# Restart Nginx
sudo systemctl restart nginx

# Restart MongoDB
sudo systemctl restart mongod
```

## 🚨 Troubleshooting

### Nếu ứng dụng không start:
```bash
# Kiểm tra logs
pm2 logs hydrology-backend

# Kiểm tra port
sudo netstat -tlnp | grep :5000

# Kiểm tra MongoDB
sudo systemctl status mongod
```

### Nếu Nginx không hoạt động:
```bash
# Kiểm tra cấu hình
sudo nginx -t

# Kiểm tra logs
sudo tail -f /var/log/nginx/error.log
```

### Nếu MongoDB không kết nối:
```bash
# Kiểm tra service
sudo systemctl status mongod

# Kiểm tra port
sudo netstat -tlnp | grep :27017

# Restart MongoDB
sudo systemctl restart mongod
```

## ✅ Hoàn thành!

Sau khi hoàn thành tất cả các bước, backend của bạn sẽ chạy tại:
- **Local**: http://localhost:5000
- **Public**: http://your-domain.com (nếu có domain)

API endpoints:
- Health check: `GET /api/v1/health`
- Real-time data: `GET /api/v1/get-tide-data-from-now`
- Locations: `GET /api/v1/get-locations` 