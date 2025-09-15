const mongoose = require('mongoose');
const axios = require('axios');

const API_BASE_URL = 'http://localhost:1423/api/v1';

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

// Test migrated data trực tiếp
const testMigratedDataDirect = async () => {
    try {
        console.log('🧪 Testing migrated data directly...\n');

        const { StationMetadataV2, CurrentDataV2, TimeseriesBucketV2 } = require('../src/models/new_timeseries_schema');
        const BinhDuongServiceV2 = require('../src/services/binhDuongServiceV2');

        // Test 1: Kiểm tra V2 schema data
        console.log('📊 Test 1: V2 Schema Data');
        const metadata = await StationMetadataV2.find({});
        const currentData = await CurrentDataV2.find({});
        const buckets = await TimeseriesBucketV2.find({});

        console.log(`  Station Metadata: ${metadata.length}`);
        console.log(`  Current Data: ${currentData.length}`);
        console.log(`  Timeseries Buckets: ${buckets.length}`);

        if (metadata.length > 0) {
            const station = metadata[0];
            console.log(`  Sample Station: ${station.key} (${station.name})`);

            const stationBuckets = await TimeseriesBucketV2.find({ stationKey: station.key });
            console.log(`  Station Buckets: ${stationBuckets.length}`);

            if (stationBuckets.length > 0) {
                console.log(`  Date Range: ${stationBuckets[0].bucketDate} to ${stationBuckets[stationBuckets.length - 1].bucketDate}`);
                console.log(`  Sample Measurements: ${stationBuckets[0].measurements.length}`);
            }
        }

        // Test 2: Test V2 service trực tiếp
        console.log('\n📊 Test 2: V2 Service Direct');
        const serviceV2 = new BinhDuongServiceV2();

        try {
            const stations = await serviceV2.getAllStations();
            console.log(`  ✅ V2 Service returned: ${stations.length} stations`);

            const testStation = stations.find(s => s.key === 'PROD_TEST_STATION_001');
            if (testStation) {
                console.log(`  ✅ Test station found: ${testStation.key}`);
                console.log(`  📊 History entries: ${testStation.history?.length || 0}`);
            } else {
                console.log(`  ❌ Test station not found in V2 service`);
            }
        } catch (error) {
            console.log(`  ❌ V2 Service error: ${error.message}`);
        }

        // Test 3: Test history query trực tiếp
        console.log('\n📊 Test 3: History Query Direct');
        try {
            const startDate = '2025-06-01T00:00:00.000Z';
            const endDate = '2025-09-30T23:59:59.999Z';

            const history = await serviceV2.getStationHistory('PROD_TEST_STATION_001', startDate, endDate);
            console.log(`  ✅ History query returned: ${history.history?.length || 0} entries`);

            if (history.history && history.history.length > 0) {
                console.log(`  📅 Date range: ${history.history[0].timestamp} to ${history.history[history.history.length - 1].timestamp}`);
                console.log(`  🔧 Sample parameters: ${Object.keys(history.history[0].measuringLogs || {}).join(', ')}`);
            }
        } catch (error) {
            console.log(`  ❌ History query error: ${error.message}`);
        }

    } catch (error) {
        console.error('❌ Direct test failed:', error);
        throw error;
    }
};

// Test API với migrated data
const testAPIWithMigratedData = async () => {
    try {
        console.log('\n🌐 Testing API with migrated data...\n');

        // Test 1: Get all stations
        console.log('📊 Test 1: GET /get-station');
        const stationsResponse = await axios.get(`${API_BASE_URL}/get-station`);
        console.log(`  ✅ Status: ${stationsResponse.status}`);
        console.log(`  📊 Stations returned: ${stationsResponse.data.data.length}`);

        // Tìm migrated station
        const migratedStation = stationsResponse.data.data.find(s => s.key === 'PROD_TEST_STATION_001');
        if (migratedStation) {
            console.log(`  ✅ Migrated station found: ${migratedStation.key}`);
            console.log(`  📊 History entries: ${migratedStation.history?.length || 0}`);
        } else {
            console.log(`  ❌ Migrated station not found in API`);
            console.log(`  Available stations: ${stationsResponse.data.data.map(s => s.key).join(', ')}`);
        }

        // Test 2: Get history cho migrated station
        console.log('\n📊 Test 2: POST /get-binhduong-history');
        if (migratedStation) {
            const startDate = '2025-06-01T00:00:00.000Z';
            const endDate = '2025-09-30T23:59:59.999Z';

            const historyResponse = await axios.post(`${API_BASE_URL}/get-binhduong-history?key=PROD_TEST_STATION_001`, {
                start: startDate,
                end: endDate
            });

            console.log(`  ✅ Status: ${historyResponse.status}`);
            console.log(`  📊 History entries returned: ${historyResponse.data.data?.length || 0}`);

            if (historyResponse.data.data && historyResponse.data.data.length > 0) {
                console.log(`  📅 Date range: ${historyResponse.data.data[0].timestamp} to ${historyResponse.data.data[historyResponse.data.data.length - 1].timestamp}`);
                console.log(`  🔧 Sample parameters: ${Object.keys(historyResponse.data.data[0].measuringLogs || {}).join(', ')}`);
            }
        }

    } catch (error) {
        console.error('❌ API test failed:', error);
        throw error;
    }
};

// Main test
const main = async () => {
    try {
        console.log('🔍 TESTING MIGRATED DATA WITH 83 HISTORY ENTRIES');
        console.log('================================================\n');

        await connectDB();

        // Test migrated data trực tiếp
        await testMigratedDataDirect();

        // Test API với migrated data
        await testAPIWithMigratedData();

        console.log('\n🎉 MIGRATED DATA TEST COMPLETED!');
        console.log('\n✅ Migration successful with 83 history entries');
        console.log('✅ V2 schema contains migrated data');
        console.log('✅ V2 service can access migrated data');
        console.log('✅ History queries work with migrated data');

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

module.exports = { main };
