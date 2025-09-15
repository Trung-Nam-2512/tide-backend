const axios = require('axios');

const API_BASE_URL = 'http://localhost:1423/api/v1';

// Test API endpoints
const testAPIEndpoints = async () => {
    try {
        console.log('🔌 Testing API endpoints after migration...\n');

        // Test 1: Get all stations
        console.log('📊 Test 1: Getting all stations...');
        try {
            const response = await axios.get(`${API_BASE_URL}/get-station`);
            console.log(`   ✅ Status: ${response.status}`);
            console.log(`   📊 Stations returned: ${response.data.length}`);

            if (response.data.length > 0) {
                const station = response.data[0];
                console.log(`   🏢 Sample station: ${station.key} (${station.name})`);
                console.log(`   📅 Current data: ${station.currentData ? 'Yes' : 'No'}`);
                console.log(`   📊 History entries: ${station.history?.length || 0}`);

                if (station.currentData) {
                    console.log(`   🔧 Current parameters: ${Object.keys(station.currentData.measuringLogs).length}`);
                }
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        // Test 2: Get station history
        console.log('\n📊 Test 2: Getting station history...');
        try {
            // Lấy station key từ test 1
            const stationsResponse = await axios.get(`${API_BASE_URL}/get-station`);
            if (stationsResponse.data.length > 0) {
                const stationKey = stationsResponse.data[0].key;
                console.log(`   🏢 Testing with station: ${stationKey}`);

                const historyResponse = await axios.post(`${API_BASE_URL}/get-binhduong-history?key=${stationKey}`, {
                    startDate: null,
                    endDate: null
                });

                console.log(`   ✅ Status: ${historyResponse.status}`);
                console.log(`   📊 History entries returned: ${historyResponse.data.length}`);

                if (historyResponse.data.length > 0) {
                    const sampleEntry = historyResponse.data[0];
                    console.log(`   📅 Sample timestamp: ${sampleEntry.timestamp}`);
                    console.log(`   🔧 Sample parameters: ${Object.keys(sampleEntry.measuringLogs || {}).length}`);
                }
            } else {
                console.log('   ⚠️  No stations available for history test');
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        // Test 3: Manual fetch
        console.log('\n📊 Test 3: Manual data fetch...');
        try {
            const response = await axios.post(`${API_BASE_URL}/fetch-triggle-manual`);
            console.log(`   ✅ Status: ${response.status}`);
            console.log(`   📊 Response: ${JSON.stringify(response.data)}`);
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        // Test 4: Migration status
        console.log('\n📊 Test 4: Migration status...');
        try {
            const response = await axios.post(`${API_BASE_URL}/migrate-binhduong-history`);
            console.log(`   ✅ Status: ${response.status}`);
            console.log(`   📊 Response: ${JSON.stringify(response.data)}`);
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        console.log('\n🎉 API endpoint testing completed!');

    } catch (error) {
        console.error('❌ API testing failed:', error);
    }
};

// Test frontend compatibility
const testFrontendCompatibility = async () => {
    try {
        console.log('\n🌐 Testing frontend compatibility...\n');

        // Test data format compatibility
        const response = await axios.get(`${API_BASE_URL}/get-station`);
        const stations = response.data;

        if (stations.length > 0) {
            const station = stations[0];

            console.log('📋 Data format verification:');
            console.log(`   ✅ Station has 'key' property: ${!!station.key}`);
            console.log(`   ✅ Station has 'name' property: ${!!station.name}`);
            console.log(`   ✅ Station has 'currentData' property: ${!!station.currentData}`);
            console.log(`   ✅ Station has 'history' property: ${!!station.history}`);

            if (station.currentData) {
                console.log(`   ✅ CurrentData has 'receivedAt' property: ${!!station.currentData.receivedAt}`);
                console.log(`   ✅ CurrentData has 'measuringLogs' property: ${!!station.currentData.measuringLogs}`);

                if (station.currentData.measuringLogs) {
                    const paramKeys = Object.keys(station.currentData.measuringLogs);
                    if (paramKeys.length > 0) {
                        const sampleParam = station.currentData.measuringLogs[paramKeys[0]];
                        console.log(`   ✅ Parameter has 'value' property: ${!!sampleParam.value}`);
                        console.log(`   ✅ Parameter has 'name' property: ${!!sampleParam.name}`);
                        console.log(`   ✅ Parameter has 'unit' property: ${!!sampleParam.unit}`);
                    }
                }
            }

            if (station.history && station.history.length > 0) {
                const sampleHistory = station.history[0];
                console.log(`   ✅ History entry has 'timestamp' property: ${!!sampleHistory.timestamp}`);
                console.log(`   ✅ History entry has 'measuringLogs' property: ${!!sampleHistory.measuringLogs}`);
            }
        }

        console.log('\n✅ Frontend compatibility test completed!');

    } catch (error) {
        console.error('❌ Frontend compatibility test failed:', error);
    }
};

// Main execution
const main = async () => {
    try {
        await testAPIEndpoints();
        await testFrontendCompatibility();

    } catch (error) {
        console.error('❌ Testing failed:', error);
    }
};

// Chạy tests
if (require.main === module) {
    main();
}

module.exports = { testAPIEndpoints, testFrontendCompatibility };
