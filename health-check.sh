#!/bin/bash

# 🔍 Health Check Script for Hydrology Backend
# Monitor and auto-restart backend if needed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
HEALTH_URL="http://localhost:5000/api/v1/health"
MAX_RETRIES=3
RETRY_DELAY=5
LOG_FILE="./logs/health-check.log"

# Create logs directory if not exists
mkdir -p logs

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Function to check health
check_health() {
    local attempt=$1
    
    if curl -f -s "$HEALTH_URL" > /dev/null 2>&1; then
        print_status "✅ Backend is healthy"
        log_message "Health check passed"
        return 0
    else
        print_warning "❌ Backend health check failed (attempt $attempt/$MAX_RETRIES)"
        log_message "Health check failed - attempt $attempt/$MAX_RETRIES"
        return 1
    fi
}

# Function to restart backend
restart_backend() {
    print_warning "🔄 Restarting backend..."
    log_message "Restarting backend due to health check failure"
    
    if pm2 restart hydrology-backend; then
        print_status "✅ Backend restarted successfully"
        log_message "Backend restarted successfully"
        return 0
    else
        print_error "❌ Failed to restart backend"
        log_message "Failed to restart backend"
        return 1
    fi
}

# Main health check logic
print_status "🔍 Starting health check..."

# Check if PM2 is running
if ! pm2 list | grep -q "hydrology-backend"; then
    print_error "❌ Backend is not running in PM2"
    log_message "Backend not found in PM2"
    exit 1
fi

# Perform health checks
for i in $(seq 1 $MAX_RETRIES); do
    if check_health $i; then
        print_status "🎉 Health check completed successfully"
        log_message "Health check completed successfully"
        exit 0
    fi
    
    if [ $i -lt $MAX_RETRIES ]; then
        print_warning "⏳ Waiting $RETRY_DELAY seconds before retry..."
        sleep $RETRY_DELAY
    fi
done

# If all retries failed, restart the backend
print_error "🚨 All health checks failed, restarting backend..."
if restart_backend; then
    print_status "⏳ Waiting for backend to start..."
    sleep 10
    
    # Check health again after restart
    if check_health "post-restart"; then
        print_status "✅ Backend is healthy after restart"
        log_message "Backend healthy after restart"
        exit 0
    else
        print_error "❌ Backend still unhealthy after restart"
        log_message "Backend still unhealthy after restart"
        exit 1
    fi
else
    print_error "❌ Failed to restart backend"
    log_message "Failed to restart backend"
    exit 1
fi 