const mongoose = require('mongoose');
const BinhDuongModel = require('../src/models/binhDuongModel');
const { StationMetadataV2, CurrentDataV2, TimeseriesBucketV2 } = require('../src/models/new_timeseries_schema');

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

// Hàm chuyển đổi dữ liệu từ old schema sang new schema
const migrateStationData = async (oldStation) => {
    console.log(`\n🔄 Migrating station: ${oldStation.key} (${oldStation.name})`);

    // 1. Tạo Station Metadata
    const stationMetadata = {
        key: oldStation.key,
        name: oldStation.name,
        address: oldStation.address,
        mapLocation: oldStation.mapLocation,
        province: oldStation.province,
        stationType: oldStation.stationType,
        status: 'active',
        createdAt: oldStation.createdAt || new Date(),
        updatedAt: oldStation.updatedAt || new Date()
    };

    // 2. Tạo Current Data (nếu có)
    let currentData = null;
    if (oldStation.currentData) {
        currentData = {
            stationKey: oldStation.key,
            receivedAt: oldStation.currentData.receivedAt,
            data: oldStation.currentData.measuringLogs,
            rawData: oldStation.currentData.measuringLogs,
            status: 'active',
            updatedAt: new Date()
        };
    }

    // 3. Tạo Timeseries Buckets từ history
    const timeseriesBuckets = [];
    if (oldStation.history && oldStation.history.length > 0) {
        console.log(`  📊 Processing ${oldStation.history.length} history entries...`);

        // Nhóm dữ liệu theo ngày
        const bucketsByDate = {};

        oldStation.history.forEach(entry => {
            const date = new Date(entry.timestamp);
            const bucketDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const bucketKey = bucketDate.toISOString().split('T')[0];

            if (!bucketsByDate[bucketKey]) {
                bucketsByDate[bucketKey] = {
                    stationKey: oldStation.key,
                    bucketDate: bucketDate,
                    measurements: [],
                    count: 0
                };
            }

            bucketsByDate[bucketKey].measurements.push({
                timestamp: entry.timestamp,
                data: entry.measuringLogs,
                quality: 'good'
            });

            bucketsByDate[bucketKey].count++;
        });

        // Chuyển đổi thành TimeseriesBucketV2 format
        Object.values(bucketsByDate).forEach(bucket => {
            // Tính toán stats cho bucket
            const stats = calculateBucketStats(bucket.measurements);

            timeseriesBuckets.push({
                stationKey: bucket.stationKey,
                bucketDate: bucket.bucketDate,
                measurements: bucket.measurements,
                count: bucket.count,
                dataHash: generateDataHash(bucket.measurements),
                compressed: false,
                archived: false,
                stats: stats,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        });

        console.log(`  📦 Created ${timeseriesBuckets.length} timeseries buckets`);
    }

    return { stationMetadata, currentData, timeseriesBuckets };
};

// Hàm tính toán stats cho bucket
const calculateBucketStats = (measurements) => {
    const stats = {
        parameters: {}
    };

    if (measurements.length === 0) return stats;

    // Lấy tất cả parameter keys từ measurements
    const allParamKeys = new Set();
    measurements.forEach(measurement => {
        if (measurement.data) {
            Object.keys(measurement.data).forEach(key => allParamKeys.add(key));
        }
    });

    // Tính stats cho từng parameter
    allParamKeys.forEach(paramKey => {
        const values = measurements
            .map(m => m.data?.[paramKey]?.value)
            .filter(v => typeof v === 'number' && !isNaN(v));

        if (values.length > 0) {
            stats.parameters[paramKey] = {
                count: values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                avg: values.reduce((a, b) => a + b, 0) / values.length
            };
        }
    });

    return stats;
};

// Hàm tạo data hash đơn giản
const generateDataHash = (measurements) => {
    const dataString = JSON.stringify(measurements.map(m => ({
        timestamp: m.timestamp,
        data: m.data
    })));
    return require('crypto').createHash('md5').update(dataString).digest('hex');
};

// Hàm migration chính
const migrateAllData = async () => {
    try {
        console.log('🚀 Starting Binh Duong data migration...\n');

        // Lấy tất cả stations từ old schema
        const oldStations = await BinhDuongModel.find({});
        console.log(`📊 Found ${oldStations.length} stations to migrate\n`);

        if (oldStations.length === 0) {
            console.log('⚠️  No stations found to migrate');
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        // Xóa dữ liệu cũ trong new schema (nếu có)
        console.log('🧹 Cleaning existing V2 data...');
        await StationMetadataV2.deleteMany({});
        await CurrentDataV2.deleteMany({});
        await TimeseriesBucketV2.deleteMany({});
        console.log('✅ V2 data cleaned\n');

        // Migrate từng station
        for (const oldStation of oldStations) {
            try {
                const { stationMetadata, currentData, timeseriesBuckets } = await migrateStationData(oldStation);

                // Lưu Station Metadata
                await StationMetadataV2.create(stationMetadata);
                console.log(`  ✅ Station metadata saved`);

                // Lưu Current Data (nếu có)
                if (currentData) {
                    await CurrentDataV2.create(currentData);
                    console.log(`  ✅ Current data saved`);
                }

                // Lưu Timeseries Buckets
                if (timeseriesBuckets.length > 0) {
                    await TimeseriesBucketV2.insertMany(timeseriesBuckets);
                    console.log(`  ✅ ${timeseriesBuckets.length} timeseries buckets saved`);
                }

                successCount++;
                console.log(`  🎉 Station ${oldStation.key} migrated successfully\n`);

            } catch (error) {
                console.error(`  ❌ Error migrating station ${oldStation.key}:`, error.message);
                errorCount++;
            }
        }

        // Báo cáo kết quả
        console.log('\n📊 MIGRATION SUMMARY');
        console.log('==================');
        console.log(`✅ Successfully migrated: ${successCount} stations`);
        console.log(`❌ Failed migrations: ${errorCount} stations`);
        console.log(`📊 Total stations: ${oldStations.length}`);

        // Kiểm tra dữ liệu sau migration
        const metadataCount = await StationMetadataV2.countDocuments();
        const currentCount = await CurrentDataV2.countDocuments();
        const bucketCount = await TimeseriesBucketV2.countDocuments();

        console.log('\n📈 V2 SCHEMA COUNTS');
        console.log('==================');
        console.log(`Station Metadata: ${metadataCount}`);
        console.log(`Current Data: ${currentCount}`);
        console.log(`Timeseries Buckets: ${bucketCount}`);

        // Kiểm tra một vài samples
        if (metadataCount > 0) {
            const sampleStation = await StationMetadataV2.findOne();
            const sampleCurrent = await CurrentDataV2.findOne({ stationKey: sampleStation.key });
            const sampleBuckets = await TimeseriesBucketV2.find({ stationKey: sampleStation.key }).limit(3);

            console.log('\n🔍 SAMPLE DATA VERIFICATION');
            console.log('===========================');
            console.log(`Sample station: ${sampleStation.key} (${sampleStation.name})`);
            console.log(`Current data: ${sampleCurrent ? 'Yes' : 'No'}`);
            console.log(`Timeseries buckets: ${sampleBuckets.length}`);

            if (sampleBuckets.length > 0) {
                console.log(`Sample bucket date: ${sampleBuckets[0].bucketDate}`);
                console.log(`Sample bucket measurements: ${sampleBuckets[0].measurements.length}`);
            }
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
};

// Hàm kiểm tra dữ liệu trước khi migration
const checkDataBeforeMigration = async () => {
    console.log('🔍 Checking data before migration...\n');

    const oldStations = await BinhDuongModel.find({});
    console.log(`📊 Old schema stations: ${oldStations.length}`);

    if (oldStations.length > 0) {
        const sampleStation = oldStations[0];
        console.log(`\n📋 Sample station: ${sampleStation.key}`);
        console.log(`- Name: ${sampleStation.name}`);
        console.log(`- History entries: ${sampleStation.history?.length || 0}`);
        console.log(`- Current data: ${sampleStation.currentData ? 'Yes' : 'No'}`);

        if (sampleStation.history && sampleStation.history.length > 0) {
            const sampleEntry = sampleStation.history[0];
            console.log(`- Sample history timestamp: ${sampleEntry.timestamp}`);
            console.log(`- Sample measuringLogs keys: ${Object.keys(sampleEntry.measuringLogs || {})}`);
        }

        if (sampleStation.currentData) {
            console.log(`- Current data measuringLogs keys: ${Object.keys(sampleStation.currentData.measuringLogs || {})}`);
        }
    }

    const v2MetadataCount = await StationMetadataV2.countDocuments();
    const v2CurrentCount = await CurrentDataV2.countDocuments();
    const v2BucketCount = await TimeseriesBucketV2.countDocuments();

    console.log(`\n📊 V2 schema current counts:`);
    console.log(`- Station Metadata: ${v2MetadataCount}`);
    console.log(`- Current Data: ${v2CurrentCount}`);
    console.log(`- Timeseries Buckets: ${v2BucketCount}`);
};

// Main execution
const main = async () => {
    try {
        await connectDB();

        // Kiểm tra dữ liệu trước khi migration
        await checkDataBeforeMigration();

        // Hỏi xác nhận trước khi migration
        console.log('\n⚠️  WARNING: This will migrate ALL data from old schema to new schema');
        console.log('⚠️  Existing V2 data will be DELETED and replaced');
        console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...');

        await new Promise(resolve => setTimeout(resolve, 5000));

        // Thực hiện migration
        await migrateAllData();

        console.log('\n🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

// Chạy migration
if (require.main === module) {
    main();
}

module.exports = { migrateAllData, checkDataBeforeMigration };
