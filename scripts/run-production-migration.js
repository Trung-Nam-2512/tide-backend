const mongoose = require('mongoose');
const { checkProductionData } = require('./check-production-data');
const { migrateAllData } = require('./migrate-binhduong-data');

// Kết nối MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/hydrology-dashboard');
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Main execution
const main = async () => {
    try {
        console.log('🚀 BINH DUONG PRODUCTION MIGRATION');
        console.log('===================================\n');

        await connectDB();

        // Bước 1: Kiểm tra dữ liệu production
        console.log('📋 STEP 1: Checking production data...\n');
        await checkProductionData();

        // Bước 2: Xác nhận migration
        console.log('\n⚠️  MIGRATION CONFIRMATION');
        console.log('==========================');
        console.log('This will migrate ALL Binh Duong data from old schema to new schema.');
        console.log('Existing V2 data will be DELETED and replaced.');
        console.log('\nPress Ctrl+C to cancel, or wait 10 seconds to continue...');

        await new Promise(resolve => setTimeout(resolve, 10000));

        // Bước 3: Thực hiện migration
        console.log('\n🔄 STEP 2: Starting migration...\n');
        await migrateAllData();

        // Bước 4: Kiểm tra kết quả
        console.log('\n✅ STEP 3: Migration completed successfully!');
        console.log('\n🎯 NEXT STEPS:');
        console.log('1. Verify API endpoints are working correctly');
        console.log('2. Test frontend functionality');
        console.log('3. Monitor system performance');
        console.log('4. Consider cleaning up old schema data after verification');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.log('\n🔧 TROUBLESHOOTING:');
        console.log('1. Check MongoDB connection');
        console.log('2. Verify database permissions');
        console.log('3. Check available disk space');
        console.log('4. Review error logs for specific issues');
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

// Chạy migration
if (require.main === module) {
    main();
}

module.exports = { main };
