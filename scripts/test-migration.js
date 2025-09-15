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

// Tạo dữ liệu test mẫu
const createTestData = async () => {
    console.log('🧪 Creating test data...\n');

    // Xóa dữ liệu cũ
    await BinhDuongModel.deleteMany({});
    await StationMetadataV2.deleteMany({});
    await CurrentDataV2.deleteMany({});
    await TimeseriesBucketV2.deleteMany({});

    // Tạo test station với history data
    const testStation = new BinhDuongModel({
        key: 'TEST_STATION_001',
        name: 'Test Station 001',
        address: 'Test Address, Test City',
        mapLocation: {
            long: 106.6297,
            lat: 10.8231
        },
        province: {
            name: 'Bình Dương',
            code: 'BD'
        },
        stationType: {
            _id: 'station_type_001',
            key: 'WATER_QUALITY',
            name: 'Water Quality Station'
        },
        currentData: {
            receivedAt: new Date(),
            measuringLogs: {
                COD: {
                    key: 'COD',
                    name: 'Chemical Oxygen Demand',
                    unit: 'mg/L',
                    value: 25.5,
                    maxLimit: 50,
                    minLimit: 0,
                    statusDevice: 1,
                    warningLevel: 'GOOD'
                },
                pH: {
                    key: 'pH',
                    name: 'pH Level',
                    unit: '',
                    value: 7.2,
                    maxLimit: 8.5,
                    minLimit: 6.5,
                    statusDevice: 1,
                    warningLevel: 'GOOD'
                },
                DO: {
                    key: 'DO',
                    name: 'Dissolved Oxygen',
                    unit: 'mg/L',
                    value: 6.8,
                    maxLimit: 10,
                    minLimit: 4,
                    statusDevice: 1,
                    warningLevel: 'GOOD'
                }
            }
        },
        history: []
    });

    // Tạo history data cho 3 ngày (mỗi 30 phút)
    const now = new Date();
    const historyEntries = [];

    for (let day = 0; day < 3; day++) {
        const baseDate = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000));

        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timestamp = new Date(baseDate.getTime() + (hour * 60 * 60 * 1000) + (minute * 60 * 1000));

                historyEntries.push({
                    timestamp: timestamp,
                    measuringLogs: {
                        COD: {
                            key: 'COD',
                            name: 'Chemical Oxygen Demand',
                            unit: 'mg/L',
                            value: 20 + Math.random() * 20, // 20-40
                            maxLimit: 50,
                            minLimit: 0,
                            statusDevice: 1,
                            warningLevel: 'GOOD'
                        },
                        pH: {
                            key: 'pH',
                            name: 'pH Level',
                            unit: '',
                            value: 6.5 + Math.random() * 2, // 6.5-8.5
                            maxLimit: 8.5,
                            minLimit: 6.5,
                            statusDevice: 1,
                            warningLevel: 'GOOD'
                        },
                        DO: {
                            key: 'DO',
                            name: 'Dissolved Oxygen',
                            unit: 'mg/L',
                            value: 4 + Math.random() * 4, // 4-8
                            maxLimit: 10,
                            minLimit: 4,
                            statusDevice: 1,
                            warningLevel: 'GOOD'
                        },
                        TSS: {
                            key: 'TSS',
                            name: 'Total Suspended Solids',
                            unit: 'mg/L',
                            value: 10 + Math.random() * 30, // 10-40
                            maxLimit: 50,
                            minLimit: 0,
                            statusDevice: 1,
                            warningLevel: 'GOOD'
                        }
                    }
                });
            }
        }
    }

    testStation.history = historyEntries;
    await testStation.save();

    console.log(`✅ Created test station with ${historyEntries.length} history entries`);
    console.log(`   Station: ${testStation.key} (${testStation.name})`);
    console.log(`   History entries: ${testStation.history.length}`);
    console.log(`   Current data parameters: ${Object.keys(testStation.currentData.measuringLogs).length}`);

    return testStation;
};

// Test migration function
const testMigration = async () => {
    try {
        console.log('🧪 Testing migration process...\n');

        // Tạo dữ liệu test
        const testStation = await createTestData();

        // Import migration function
        const { migrateAllData } = require('./migrate-binhduong-data');

        // Chạy migration
        await migrateAllData();

        // Kiểm tra kết quả
        console.log('\n🔍 Verifying migration results...\n');

        const metadataCount = await StationMetadataV2.countDocuments();
        const currentCount = await CurrentDataV2.countDocuments();
        const bucketCount = await TimeseriesBucketV2.countDocuments();

        console.log(`📊 Migration Results:`);
        console.log(`- Station Metadata: ${metadataCount}`);
        console.log(`- Current Data: ${currentCount}`);
        console.log(`- Timeseries Buckets: ${bucketCount}`);

        // Kiểm tra chi tiết
        if (metadataCount > 0) {
            const station = await StationMetadataV2.findOne();
            console.log(`\n📋 Station Metadata:`);
            console.log(`- Key: ${station.key}`);
            console.log(`- Name: ${station.name}`);
            console.log(`- Status: ${station.status}`);
        }

        if (currentCount > 0) {
            const current = await CurrentDataV2.findOne();
            console.log(`\n📊 Current Data:`);
            console.log(`- Station Key: ${current.stationKey}`);
            console.log(`- Received At: ${current.receivedAt}`);
            console.log(`- Parameters: ${Object.keys(current.data).length}`);
        }

        if (bucketCount > 0) {
            const buckets = await TimeseriesBucketV2.find({}).sort({ bucketDate: 1 });
            console.log(`\n📦 Timeseries Buckets:`);
            console.log(`- Total Buckets: ${buckets.length}`);
            console.log(`- Date Range: ${buckets[0].bucketDate} to ${buckets[buckets.length - 1].bucketDate}`);

            buckets.forEach((bucket, index) => {
                console.log(`  Bucket ${index + 1}: ${bucket.bucketDate} (${bucket.measurements.length} measurements)`);
            });
        }

        // Test API compatibility
        console.log('\n🔌 Testing API compatibility...\n');

        const BinhDuongServiceV2 = require('../src/services/binhDuongServiceV2');
        const serviceV2 = new BinhDuongServiceV2();

        try {
            const stations = await serviceV2.getAllStations();
            console.log(`✅ getAllStations() returned ${stations.length} stations`);

            if (stations.length > 0) {
                const station = stations[0];
                console.log(`   Station: ${station.key} (${station.name})`);
                console.log(`   Current Data: ${station.currentData ? 'Yes' : 'No'}`);
                console.log(`   History Entries: ${station.history?.length || 0}`);

                if (station.currentData) {
                    console.log(`   Current Data Parameters: ${Object.keys(station.currentData.measuringLogs).length}`);
                }
            }

            // Test history retrieval
            if (stations.length > 0) {
                const stationKey = stations[0].key;
                const history = await serviceV2.getStationHistory(stationKey, null, null);
                console.log(`✅ getStationHistory() returned ${history.length} entries for ${stationKey}`);
            }

        } catch (error) {
            console.error(`❌ API compatibility test failed:`, error.message);
        }

        console.log('\n🎉 Migration test completed successfully!');

    } catch (error) {
        console.error('❌ Migration test failed:', error);
        throw error;
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await testMigration();

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

// Chạy test
if (require.main === module) {
    main();
}

module.exports = { testMigration, createTestData };
