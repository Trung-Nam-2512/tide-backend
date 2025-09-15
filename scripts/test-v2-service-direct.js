const mongoose = require('mongoose');
const BinhDuongServiceV2 = require('../src/services/binhDuongServiceV2');

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

// Test V2 service directly
const testV2Service = async () => {
    try {
        console.log('🧪 Testing V2 service directly...\n');

        const serviceV2 = new BinhDuongServiceV2();

        // Test 1: Get all stations
        console.log('📊 Test 1: Get all stations');
        try {
            const stations = await serviceV2.getAllStations();
            console.log(`  ✅ Stations returned: ${stations.length}`);

            const testStation = stations.find(s => s.key === 'PROD_TEST_STATION_001');
            if (testStation) {
                console.log(`  ✅ Test station found: ${testStation.key}`);
                console.log(`  📊 History entries: ${testStation.history?.length || 0}`);
            } else {
                console.log(`  ❌ Test station not found`);
                console.log(`  Available stations: ${stations.map(s => s.key).join(', ')}`);
            }
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }

        // Test 2: Get station history
        console.log('\n📊 Test 2: Get station history');
        try {
            const startDate = '2025-06-01T00:00:00.000Z';
            const endDate = '2025-09-30T23:59:59.999Z';

            console.log(`  Querying: ${startDate} to ${endDate}`);

            const history = await serviceV2.getStationHistory('PROD_TEST_STATION_001', startDate, endDate);
            console.log(`  ✅ History returned: ${history.history?.length || 0} entries`);

            if (history.history && history.history.length > 0) {
                console.log(`  📅 Date range: ${history.history[0].timestamp} to ${history.history[history.history.length - 1].timestamp}`);
                console.log(`  🔧 Sample parameters: ${Object.keys(history.history[0].measuringLogs || {}).join(', ')}`);
            }
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }

        // Test 3: Get recent history
        console.log('\n📊 Test 3: Get recent history');
        try {
            const recentHistory = await serviceV2.getRecentHistoryForStation('PROD_TEST_STATION_001', 10);
            console.log(`  ✅ Recent history returned: ${recentHistory?.length || 0} entries`);

            if (recentHistory && recentHistory.length > 0) {
                console.log(`  📅 Latest entry: ${recentHistory[0].timestamp}`);
                console.log(`  🔧 Sample parameters: ${Object.keys(recentHistory[0].measuringLogs || {}).join(', ')}`);
            }
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }

    } catch (error) {
        console.error('❌ V2 service test failed:', error);
        throw error;
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await testV2Service();

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

module.exports = { testV2Service };
