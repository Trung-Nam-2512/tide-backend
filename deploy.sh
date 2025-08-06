#!/bin/bash

# 🚀 Automated Deployment Script for Hydrology Backend
# Ubuntu Server Deployment

set -e  # Exit on any error

echo "🚀 Starting automated deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Step 1: Update system
print_status "Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Step 2: Install required packages
print_status "Installing required packages..."
sudo apt install -y curl wget git build-essential

# Step 3: Install Node.js
print_status "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js version: $NODE_VERSION"
print_status "NPM version: $NPM_VERSION"

# Step 4: Install MongoDB
print_status "Installing MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start and enable MongoDB
print_status "Starting MongoDB service..."
sudo systemctl start mongod
sudo systemctl enable mongod

# Step 5: Create application directory
print_status "Setting up application directory..."
sudo mkdir -p /var/www/hydrology-backend
sudo chown $USER:$USER /var/www/hydrology-backend

# Step 6: Clone repository
print_status "Cloning repository..."
cd /var/www/hydrology-backend
if [ -d ".git" ]; then
    print_warning "Repository already exists, pulling latest changes..."
    git pull origin main
else
    git clone https://github.com/Trung-Nam-2512/tide-backend.git .
fi

# Step 7: Install dependencies
print_status "Installing Node.js dependencies..."
npm install --production

# Step 8: Create environment file
print_status "Creating environment configuration..."
cat > .env << EOF
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://localhost:27017/project-water-level-forecast
EOF

chmod 600 .env

# Step 9: Install PM2
print_status "Installing PM2 process manager..."
sudo npm install -g pm2

# Step 10: Start application with PM2
print_status "Starting application with PM2..."
pm2 start src/server.js --name "hydrology-backend"
pm2 save
pm2 startup

# Step 11: Install and configure Nginx
print_status "Installing and configuring Nginx..."
sudo apt install -y nginx

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/hydrology-backend << EOF
server {
    listen 80;
    server_name _;  # Accept any domain

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

# Enable site
sudo ln -sf /etc/nginx/sites-available/hydrology-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Step 12: Configure firewall
print_status "Configuring firewall..."
sudo apt install -y ufw
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Step 13: Wait for application to start
print_status "Waiting for application to start..."
sleep 5

# Step 14: Test the application
print_status "Testing application..."
if curl -s http://localhost:5000/api/v1/health > /dev/null; then
    print_status "✅ Application is running successfully!"
else
    print_warning "⚠️  Application might need more time to start"
fi

# Step 15: Display status
print_status "Deployment completed! Here's the status:"
echo ""
echo "📊 PM2 Status:"
pm2 status
echo ""
echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager -l
echo ""
echo "🍃 MongoDB Status:"
sudo systemctl status mongod --no-pager -l
echo ""
echo "🔒 Firewall Status:"
sudo ufw status
echo ""

print_status "🎉 Deployment completed successfully!"
print_status "Your API is now available at:"
print_status "  - Local: http://localhost:5000"
print_status "  - Public: http://$(curl -s ifconfig.me)"
echo ""
print_status "API Endpoints:"
print_status "  - Health: GET /api/v1/health"
print_status "  - Real-time: GET /api/v1/get-tide-data-from-now"
print_status "  - Locations: GET /api/v1/get-locations"
echo ""
print_status "Useful commands:"
print_status "  - View logs: pm2 logs hydrology-backend"
print_status "  - Restart: pm2 restart hydrology-backend"
print_status "  - Monitor: pm2 monit" 