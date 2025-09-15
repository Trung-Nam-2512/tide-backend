const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Kết nối MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/project-water-level-forecast');
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Backup function
const backupBeforeMigration = async () => {
    try {
        console.log('💾 Creating backup before migration...\n');

        const BinhDuongModel = require('../src/models/binhDuongModel');
        const { StationMetadataV2, CurrentDataV2, TimeseriesBucketV2 } = require('../src/models/new_timeseries_schema');

        // 1. Backup old schema
        console.log('📊 Step 1: Backing up old schema (binhduongstations)...');
        const oldStations = await BinhDuongModel.find({});
        console.log(`  - Found ${oldStations.length} stations in old schema`);

        const oldBackup = {
            timestamp: new Date().toISOString(),
            collection: 'binhduongstations',
            count: oldStations.length,
            data: oldStations
        };

        const oldBackupPath = path.join(__dirname, `backup_old_schema_${Date.now()}.json`);
        fs.writeFileSync(oldBackupPath, JSON.stringify(oldBackup, null, 2));
        console.log(`  ✅ Old schema backed up to: ${oldBackupPath}`);

        // 2. Backup V2 schema
        console.log('\n📊 Step 2: Backing up V2 schema...');
        const v2Metadata = await StationMetadataV2.find({});
        const v2Current = await CurrentDataV2.find({});
        const v2Buckets = await TimeseriesBucketV2.find({});

        console.log(`  - V2 Metadata: ${v2Metadata.length}`);
        console.log(`  - V2 Current Data: ${v2Current.length}`);
        console.log(`  - V2 Buckets: ${v2Buckets.length}`);

        const v2Backup = {
            timestamp: new Date().toISOString(),
            metadata: v2Metadata,
            currentData: v2Current,
            buckets: v2Buckets
        };

        const v2BackupPath = path.join(__dirname, `backup_v2_schema_${Date.now()}.json`);
        fs.writeFileSync(v2BackupPath, JSON.stringify(v2Backup, null, 2));
        console.log(`  ✅ V2 schema backed up to: ${v2BackupPath}`);

        // 3. Create summary
        const summary = {
            timestamp: new Date().toISOString(),
            oldSchema: {
                collection: 'binhduongstations',
                count: oldStations.length,
                backupFile: oldBackupPath
            },
            v2Schema: {
                metadata: v2Metadata.length,
                currentData: v2Current.length,
                buckets: v2Buckets.length,
                backupFile: v2BackupPath
            }
        };

        const summaryPath = path.join(__dirname, `backup_summary_${Date.now()}.json`);
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        console.log(`  ✅ Summary created: ${summaryPath}`);

        console.log('\n🎉 Backup completed successfully!');
        console.log('✅ You can now safely run the migration');
        console.log('✅ If something goes wrong, you can restore from these backup files');

    } catch (error) {
        console.error('❌ Backup failed:', error);
        throw error;
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await backupBeforeMigration();

    } catch (error) {
        console.error('❌ Backup failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

// Chạy backup
if (require.main === module) {
    main();
}

module.exports = { backupBeforeMigration };