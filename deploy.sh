#!/bin/bash

# 🚀 Automated Deployment Script for Hydrology Backend
# Deploy and restart backend with PM2

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_status "🚀 Starting backend deployment..."

# Step 1: Check if PM2 is installed
print_step "Checking PM2 installation..."
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 is not installed. Please install PM2 first:"
    print_error "sudo npm install -g pm2"
    exit 1
fi
print_status "✅ PM2 is installed"

# Step 2: Create logs directory
print_step "Creating logs directory..."
mkdir -p logs
print_status "✅ Logs directory created"

# Step 3: Pull latest code
print_step "Pulling latest code..."
if git pull origin main; then
    print_status "✅ Code updated successfully"
else
    print_warning "⚠️  Could not pull latest code (continuing with current version)"
fi

# Step 4: Install dependencies
print_step "Installing dependencies..."
if npm install --production; then
    print_status "✅ Dependencies installed"
else
    print_error "❌ Failed to install dependencies"
    exit 1
fi

# Step 5: Check if app is already running
print_step "Checking current PM2 status..."
if pm2 list | grep -q "hydrology-backend"; then
    print_status "✅ App is already running, restarting..."
    pm2 restart hydrology-backend
else
    print_status "✅ Starting app for the first time..."
    pm2 start ecosystem.config.js --env production
fi

# Step 6: Save PM2 configuration
print_step "Saving PM2 configuration..."
pm2 save
print_status "✅ PM2 configuration saved"

# Step 7: Check app status
print_step "Checking app status..."
sleep 3
if pm2 list | grep -q "hydrology-backend.*online"; then
    print_status "✅ App is running successfully"
else
    print_error "❌ App failed to start"
    print_error "Check logs with: pm2 logs hydrology-backend"
    exit 1
fi

# Step 8: Test health endpoint
print_step "Testing health endpoint..."
sleep 2
if curl -f -s http://localhost:5000/api/v1/health > /dev/null; then
    print_status "✅ Health check passed"
else
    print_warning "⚠️  Health check failed (app might still be starting)"
fi

# Step 9: Display final status
print_status "🎉 Deployment completed successfully!"
echo ""
print_status "📊 PM2 Status:"
pm2 list
echo ""
print_status "🔗 API Endpoints:"
print_status "   Health: http://localhost:5000/api/v1/health"
print_status "   Tide Data: http://localhost:5000/api/v1/get-tide-data-from-now"
print_status "   Locations: http://localhost:5000/api/v1/get-locations"
echo ""
print_status "📝 Useful commands:"
print_status "   View logs: pm2 logs hydrology-backend"
print_status "   Monitor: pm2 monit"
print_status "   Restart: pm2 restart hydrology-backend"
print_status "   Stop: pm2 stop hydrology-backend" 