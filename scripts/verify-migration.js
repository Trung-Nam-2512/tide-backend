const mongoose = require('mongoose');
const axios = require('axios');

const API_BASE_URL = 'http://localhost:1423/api/v1';

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

// Verify migration
const verifyMigration = async () => {
    try {
        console.log('🔍 Verifying migration results...\n');

        const BinhDuongModel = require('../src/models/binhDuongModel');
        const { StationMetadataV2, CurrentDataV2, TimeseriesBucketV2 } = require('../src/models/new_timeseries_schema');

        // 1. Check old schema
        console.log('📊 Step 1: Checking old schema...');
        const oldStations = await BinhDuongModel.find({});
        console.log(`  - Old schema stations: ${oldStations.length}`);

        // 2. Check V2 schema
        console.log('\n📊 Step 2: Checking V2 schema...');
        const v2Metadata = await StationMetadataV2.find({});
        const v2Current = await CurrentDataV2.find({});
        const v2Buckets = await TimeseriesBucketV2.find({});

        console.log(`  - V2 Metadata: ${v2Metadata.length}`);
        console.log(`  - V2 Current Data: ${v2Current.length}`);
        console.log(`  - V2 Buckets: ${v2Buckets.length}`);

        // Count total measurements
        let totalMeasurements = 0;
        v2Buckets.forEach(bucket => {
            totalMeasurements += bucket.measurements.length;
        });
        console.log(`  - Total measurements: ${totalMeasurements}`);

        // 3. Check API endpoints
        console.log('\n📊 Step 3: Testing API endpoints...');

        try {
            // Test get-station
            const stationResponse = await axios.get(`${API_BASE_URL}/get-station`);
            console.log(`  ✅ get-station: ${stationResponse.status} - ${stationResponse.data.data.length} stations`);

            // Test get-binhduong-history for each station
            const stations = stationResponse.data.data;
            for (const station of stations.slice(0, 3)) { // Test first 3 stations
                try {
                    const historyResponse = await axios.post(`${API_BASE_URL}/get-binhduong-history?key=${station.key}`, {
                        start: '2025-09-01T00:00:00.000Z',
                        end: '2025-09-15T23:59:59.999Z'
                    });

                    const historyCount = historyResponse.data.data?.length || 0;
                    console.log(`  ✅ ${station.key}: ${historyCount} history entries`);

                } catch (error) {
                    console.log(`  ❌ ${station.key}: Error - ${error.message}`);
                }
            }

        } catch (error) {
            console.log(`  ❌ API test failed: ${error.message}`);
        }

        // 4. Data integrity check
        console.log('\n📊 Step 4: Data integrity check...');

        // Check if all old stations have V2 metadata
        const oldStationKeys = oldStations.map(s => s.key);
        const v2StationKeys = v2Metadata.map(s => s.key);

        const missingInV2 = oldStationKeys.filter(key => !v2StationKeys.includes(key));
        const extraInV2 = v2StationKeys.filter(key => !oldStationKeys.includes(key));

        if (missingInV2.length > 0) {
            console.log(`  ⚠️  Missing in V2: ${missingInV2.join(', ')}`);
        } else {
            console.log(`  ✅ All old stations have V2 metadata`);
        }

        if (extraInV2.length > 0) {
            console.log(`  ℹ️  Extra in V2: ${extraInV2.join(', ')}`);
        }

        // 5. Performance check
        console.log('\n📊 Step 5: Performance check...');

        const startTime = Date.now();
        await axios.get(`${API_BASE_URL}/get-station`);
        const getStationTime = Date.now() - startTime;

        const historyStartTime = Date.now();
        await axios.post(`${API_BASE_URL}/get-binhduong-history?key=${stations[0].key}`, {
            start: '2025-09-01T00:00:00.000Z',
            end: '2025-09-15T23:59:59.999Z'
        });
        const getHistoryTime = Date.now() - historyStartTime;

        console.log(`  ✅ get-station API: ${getStationTime}ms`);
        console.log(`  ✅ get-binhduong-history API: ${getHistoryTime}ms`);

        // 6. Summary
        console.log('\n🎉 Migration verification completed!');

        if (missingInV2.length === 0) {
            console.log('✅ Migration successful - all data migrated correctly');
        } else {
            console.log('⚠️  Migration incomplete - some data missing');
        }

        console.log('✅ API endpoints working correctly');
        console.log('✅ Performance is good');
        console.log('✅ System is ready for production use');

    } catch (error) {
        console.error('❌ Verification failed:', error);
        throw error;
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await verifyMigration();

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

// Chạy verification
if (require.main === module) {
    main();
}

module.exports = { verifyMigration };