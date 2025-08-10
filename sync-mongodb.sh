#!/bin/bash

# 🔄 Automated MongoDB Sync Script
# Sync data from local MongoDB to Ubuntu server

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

# Check arguments
if [ $# -ne 2 ]; then
    print_error "Usage: $0 <server-ip> <username>"
    print_error "Example: $0 192.168.1.100 ubuntu"
    exit 1
fi

SERVER_IP=$1
USERNAME=$2
DB_NAME="project-water-level-forecast"
BACKUP_DIR="$HOME/mongodb-backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="mongodb-backup-$TIMESTAMP.tar.gz"

print_status "🚀 Starting MongoDB sync to $SERVER_IP..."

# Step 1: Check MongoDB connection
print_step "Checking MongoDB connection..."
if ! mongo --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    print_error "Cannot connect to MongoDB. Please make sure MongoDB is running."
    exit 1
fi
print_status "✅ MongoDB connection successful"

# Step 2: Check database exists
print_step "Checking database existence..."
DB_COUNT=$(mongo $DB_NAME --quiet --eval "db.stats().collections" 2>/dev/null || echo "0")
if [ "$DB_COUNT" -eq "0" ]; then
    print_warning "Database $DB_NAME is empty or doesn't exist"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 3: Create backup directory
print_step "Creating backup directory..."
rm -rf "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Step 4: Create MongoDB backup
print_step "Creating MongoDB backup..."
if mongodump --db "$DB_NAME" --out "$BACKUP_DIR" > /dev/null 2>&1; then
    print_status "✅ Backup created successfully"
else
    print_error "Failed to create backup"
    exit 1
fi

# Step 5: Check backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
print_status "Backup size: $BACKUP_SIZE"

# Step 6: Create archive
print_step "Creating archive..."
cd "$BACKUP_DIR"
if tar -czf "$HOME/$ARCHIVE_NAME" . > /dev/null 2>&1; then
    print_status "✅ Archive created: $ARCHIVE_NAME"
else
    print_error "Failed to create archive"
    exit 1
fi

# Step 7: Check SSH connection
print_step "Testing SSH connection..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$USERNAME@$SERVER_IP" exit 2>/dev/null; then
    print_error "Cannot connect to server via SSH"
    print_error "Please make sure:"
    print_error "1. Server IP is correct: $SERVER_IP"
    print_error "2. Username is correct: $USERNAME"
    print_error "3. SSH key is configured or password authentication is enabled"
    exit 1
fi
print_status "✅ SSH connection successful"

# Step 8: Check server disk space
print_step "Checking server disk space..."
SERVER_DISK=$(ssh "$USERNAME@$SERVER_IP" "df -h /tmp | tail -1 | awk '{print \$4}'")
print_status "Server available space: $SERVER_DISK"

# Step 9: Copy archive to server
print_step "Copying archive to server..."
if scp "$HOME/$ARCHIVE_NAME" "$USERNAME@$SERVER_IP:/tmp/" > /dev/null 2>&1; then
    print_status "✅ Archive copied to server"
else
    print_error "Failed to copy archive to server"
    exit 1
fi

# Step 10: Restore on server
print_step "Restoring data on server..."
ssh "$USERNAME@$SERVER_IP" << EOF
    set -e
    echo "📦 Extracting archive..."
    cd /tmp
    tar -xzf $ARCHIVE_NAME
    
    echo "📥 Restoring MongoDB data..."
    if mongorestore --db $DB_NAME project-water-level-forecast/ > /dev/null 2>&1; then
        echo "✅ Data restored successfully"
    else
        echo "❌ Failed to restore data"
        exit 1
    fi
    
    echo "🧹 Cleaning up..."
    rm -rf project-water-level-forecast $ARCHIVE_NAME
    
    echo "📊 Verifying data..."
    DOC_COUNT=\$(mongo $DB_NAME --quiet --eval "db.tides.count()" 2>/dev/null || echo "0")
    echo "📄 Documents in tides collection: \$DOC_COUNT"
EOF

if [ $? -eq 0 ]; then
    print_status "✅ Data restored on server successfully"
else
    print_error "Failed to restore data on server"
    exit 1
fi

# Step 11: Verify sync
print_step "Verifying sync..."
LOCAL_COUNT=$(mongo $DB_NAME --quiet --eval "db.tides.count()" 2>/dev/null || echo "0")
SERVER_COUNT=$(ssh "$USERNAME@$SERVER_IP" "mongo $DB_NAME --quiet --eval 'db.tides.count()'" 2>/dev/null || echo "0")

print_status "📊 Data comparison:"
print_status "Local: $LOCAL_COUNT documents"
print_status "Server: $SERVER_COUNT documents"

if [ "$LOCAL_COUNT" -eq "$SERVER_COUNT" ] && [ "$LOCAL_COUNT" -gt "0" ]; then
    print_status "✅ Sync successful! Documents match."
elif [ "$LOCAL_COUNT" -eq "0" ] && [ "$SERVER_COUNT" -eq "0" ]; then
    print_warning "⚠️  Both local and server have 0 documents"
else
    print_warning "⚠️  Document counts don't match, but sync completed"
fi

# Step 12: Cleanup local files
print_step "Cleaning up local files..."
rm -rf "$BACKUP_DIR" "$HOME/$ARCHIVE_NAME"
print_status "✅ Cleanup completed"

# Step 13: Final status
print_status "🎉 MongoDB sync completed successfully!"
print_status "Server: $SERVER_IP"
print_status "Database: $DB_NAME"
print_status "Documents synced: $SERVER_COUNT"

echo ""
print_status "🔗 Your backend API should now be accessible at:"
print_status "   http://$SERVER_IP/api/v1/health"
print_status "   http://$SERVER_IP/api/v1/get-tide-data-from-now" 