const mongoose = require('mongoose');
const { backupData } = require('./backup-before-migration');
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

// Workflow chính
const runMigrationWorkflow = async () => {
    try {
        console.log('🚀 BINH DUONG MIGRATION WORKFLOW');
        console.log('=================================\n');

        await connectDB();

        // Bước 1: Backup dữ liệu
        console.log('📋 STEP 1: Creating backup...\n');
        const backupFile = await backupData();
        console.log(`✅ Backup created: ${backupFile}\n`);

        // Bước 2: Kiểm tra dữ liệu production
        console.log('📋 STEP 2: Analyzing production data...\n');
        await checkProductionData();

        // Bước 3: Xác nhận migration
        console.log('\n⚠️  MIGRATION CONFIRMATION');
        console.log('==========================');
        console.log('This will migrate ALL Binh Duong data from old schema to new schema.');
        console.log('Existing V2 data will be DELETED and replaced.');
        console.log(`Backup file: ${backupFile}`);
        console.log('\nPress Ctrl+C to cancel, or wait 15 seconds to continue...');

        await new Promise(resolve => setTimeout(resolve, 15000));

        // Bước 4: Thực hiện migration
        console.log('\n🔄 STEP 3: Starting migration...\n');
        await migrateAllData();

        // Bước 5: Kiểm tra kết quả
        console.log('\n✅ STEP 4: Migration completed successfully!');

        // Bước 6: Hướng dẫn tiếp theo
        console.log('\n🎯 NEXT STEPS:');
        console.log('==============');
        console.log('1. Test API endpoints:');
        console.log('   - GET /api/v1/get-station');
        console.log('   - POST /api/v1/get-binhduong-history');
        console.log('');
        console.log('2. Test frontend functionality:');
        console.log('   - Check station list loading');
        console.log('   - Check chart data display');
        console.log('   - Verify parameter selection');
        console.log('');
        console.log('3. Monitor system performance:');
        console.log('   - Check response times');
        console.log('   - Monitor memory usage');
        console.log('   - Watch for any errors');
        console.log('');
        console.log('4. After verification (optional):');
        console.log('   - Consider cleaning up old schema data');
        console.log('   - Archive backup files');
        console.log('');
        console.log('5. If issues occur:');
        console.log(`   - Restore from backup: node scripts/backup-before-migration.js restore "${backupFile}"`);
        console.log('');

        console.log('🎉 Migration workflow completed successfully!');

    } catch (error) {
        console.error('❌ Migration workflow failed:', error);
        console.log('\n🔧 TROUBLESHOOTING:');
        console.log('1. Check MongoDB connection');
        console.log('2. Verify database permissions');
        console.log('3. Check available disk space');
        console.log('4. Review error logs for specific issues');
        console.log('5. Restore from backup if needed');
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

// Chạy workflow
if (require.main === module) {
    runMigrationWorkflow();
}

module.exports = { runMigrationWorkflow };
