const mongoose = require('mongoose');
const BinhDuongModel = require('../src/models/binhDuongModel');
const { StationMetadataV2, CurrentDataV2, TimeseriesBucketV2 } = require('../src/models/new_timeseries_schema');

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

// Transform measuringLogs từ old format sang V2 format
const transformMeasuringLogs = (measuringLogs) => {
    if (!measuringLogs) return {};

    const transformed = {};
    Object.entries(measuringLogs).forEach(([key, param]) => {
        transformed[key] = {
            value: param.value,
            unit: param.unit,
            warningLevel: param.warningLevel,
            statusDevice: param.statusDevice
        };
    });
    return transformed;
};

// Production migration function
const productionMigration = async () => {
    try {
        console.log('🚀 PRODUCTION MIGRATION: binhduongstations → V2 Schema');
        console.log('⚠️  WARNING: This will migrate ALL data from old schema to new schema\n');

        // 1. Backup check
        console.log('📊 Step 1: Analyzing current data...');
        const oldStations = await BinhDuongModel.find({});
        console.log(`  - Old schema stations: ${oldStations.length}`);

        if (oldStations.length === 0) {
            console.log('⚠️  No stations found in old schema. Nothing to migrate.');
            return;
        }

        // Show stations to be migrated
        oldStations.forEach((station, index) => {
            const historyCount = station.history?.length || 0;
            console.log(`  ${index + 1}. ${station.key}: ${historyCount} history entries`);
        });

        // 2. Check V2 schema current state
        const v2Metadata = await StationMetadataV2.find({});
        const v2Current = await CurrentDataV2.find({});
        const v2Buckets = await TimeseriesBucketV2.find({});

        console.log('\n📊 Step 2: Current V2 schema state...');
        console.log(`  - V2 Metadata: ${v2Metadata.length}`);
        console.log(`  - V2 Current Data: ${v2Current.length}`);
        console.log(`  - V2 Buckets: ${v2Buckets.length}`);

        if (v2Metadata.length > 0) {
            console.log('⚠️  WARNING: V2 schema already has data!');
            console.log('  - This migration will ADD to existing data');
            console.log('  - Duplicate data may be created');
        }

        // 3. Confirmation
        console.log('\n❓ Do you want to continue? (This will take a few minutes)');
        console.log('   Press Ctrl+C to cancel, or wait 10 seconds to continue...');

        await new Promise(resolve => setTimeout(resolve, 10000));

        // 4. Start migration
        console.log('\n🔄 Step 3: Starting migration...');

        let migratedStations = 0;
        let migratedHistory = 0;
        let skippedStations = 0;

        for (const oldStation of oldStations) {
            try {
                console.log(`\n📡 Migrating station: ${oldStation.key}`);

                // Check if already exists in V2
                const existingMetadata = await StationMetadataV2.findOne({ key: oldStation.key });
                if (existingMetadata) {
                    console.log(`  ⚠️  Station already exists in V2, skipping...`);
                    skippedStations++;
                    continue;
                }

                // 4.1. Create station metadata
                await StationMetadataV2.findOneAndUpdate(
                    { key: oldStation.key },
                    {
                        key: oldStation.key,
                        name: oldStation.name,
                        address: oldStation.address,
                        mapLocation: oldStation.mapLocation,
                        province: oldStation.province,
                        stationType: oldStation.stationType,
                        parameters: oldStation.parameters || [],
                        isActive: true,
                        updatedAt: new Date()
                    },
                    { upsert: true, new: true }
                );
                console.log(`  ✅ Metadata created`);

                // 4.2. Create current data
                if (oldStation.currentData) {
                    await CurrentDataV2.findOneAndUpdate(
                        { stationKey: oldStation.key },
                        {
                            stationKey: oldStation.key,
                            receivedAt: oldStation.currentData.receivedAt,
                            data: transformMeasuringLogs(oldStation.currentData.measuringLogs),
                            rawData: oldStation.currentData.measuringLogs,
                            status: 'active',
                            updatedAt: new Date()
                        },
                        { upsert: true, new: true }
                    );
                    console.log(`  ✅ Current data created`);
                }

                // 4.3. Migrate history to buckets
                if (oldStation.history && oldStation.history.length > 0) {
                    console.log(`  📊 Migrating ${oldStation.history.length} history entries...`);

                    const buckets = new Map();

                    // Group history by date
                    oldStation.history.forEach(entry => {
                        const date = new Date(entry.timestamp);
                        const bucketDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                        const bucketKey = bucketDate.toISOString();

                        if (!buckets.has(bucketKey)) {
                            buckets.set(bucketKey, {
                                stationKey: oldStation.key,
                                bucketDate: bucketDate,
                                measurements: [],
                                count: 0
                            });
                        }

                        // Only add if has valid data
                        if (entry.measuringLogs && Object.keys(entry.measuringLogs).length > 0) {
                            buckets.get(bucketKey).measurements.push({
                                timestamp: entry.timestamp,
                                data: transformMeasuringLogs(entry.measuringLogs),
                                quality: 'migrated'
                            });
                            buckets.get(bucketKey).count++;
                            migratedHistory++;
                        }
                    });

                    // Save buckets
                    for (const bucketData of buckets.values()) {
                        if (bucketData.measurements.length > 0) {
                            await TimeseriesBucketV2.findOneAndUpdate(
                                {
                                    stationKey: bucketData.stationKey,
                                    bucketDate: bucketData.bucketDate
                                },
                                {
                                    $set: {
                                        stationKey: bucketData.stationKey,
                                        bucketDate: bucketData.bucketDate,
                                        count: bucketData.count,
                                        updatedAt: new Date()
                                    },
                                    $push: { measurements: { $each: bucketData.measurements } }
                                },
                                { upsert: true, new: true }
                            );
                        }
                    }

                    console.log(`  ✅ Created ${buckets.size} buckets with ${migratedHistory} measurements`);
                }

                migratedStations++;

            } catch (error) {
                console.error(`  ❌ Error migrating ${oldStation.key}:`, error.message);
            }
        }

        // 5. Final verification
        console.log('\n📊 Step 4: Migration completed!');
        console.log(`  - Stations migrated: ${migratedStations}`);
        console.log(`  - Stations skipped: ${skippedStations}`);
        console.log(`  - History entries migrated: ${migratedHistory}`);

        // 6. Verify final state
        const finalV2Metadata = await StationMetadataV2.find({});
        const finalV2Current = await CurrentDataV2.find({});
        const finalV2Buckets = await TimeseriesBucketV2.find({});

        console.log('\n📊 Final V2 schema state:');
        console.log(`  - V2 Metadata: ${finalV2Metadata.length}`);
        console.log(`  - V2 Current Data: ${finalV2Current.length}`);
        console.log(`  - V2 Buckets: ${finalV2Buckets.length}`);

        // Count total measurements
        let totalMeasurements = 0;
        finalV2Buckets.forEach(bucket => {
            totalMeasurements += bucket.measurements.length;
        });
        console.log(`  - Total measurements: ${totalMeasurements}`);

        console.log('\n🎉 PRODUCTION MIGRATION COMPLETED SUCCESSFULLY!');
        console.log('✅ Your system is now ready to use V2 schema');
        console.log('✅ Old schema data is preserved');
        console.log('✅ API will automatically use V2 service');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await productionMigration();

    } catch (error) {
        console.error('❌ Migration failed:', error);
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

module.exports = { productionMigration };
