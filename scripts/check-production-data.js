const mongoose = require('mongoose');
const BinhDuongModel = require('../src/models/binhDuongModel');

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

// Hàm kiểm tra dữ liệu production
const checkProductionData = async () => {
    try {
        console.log('🔍 Checking production data structure...\n');

        // Đếm tổng số stations
        const totalStations = await BinhDuongModel.countDocuments();
        console.log(`📊 Total stations: ${totalStations}`);

        if (totalStations === 0) {
            console.log('⚠️  No stations found in production database');
            return;
        }

        // Lấy một vài stations để phân tích
        const sampleStations = await BinhDuongModel.find({}).limit(3);

        console.log(`\n📋 Analyzing ${sampleStations.length} sample stations...\n`);

        let totalHistoryEntries = 0;
        let totalCurrentData = 0;
        let allParameterKeys = new Set();
        let dateRange = { earliest: null, latest: null };

        sampleStations.forEach((station, index) => {
            console.log(`\n🏢 Station ${index + 1}: ${station.key}`);
            console.log(`   Name: ${station.name}`);
            console.log(`   Address: ${station.address || 'N/A'}`);
            console.log(`   Province: ${station.province ? JSON.stringify(station.province) : 'N/A'}`);
            console.log(`   Station Type: ${station.stationType ? station.stationType.name : 'N/A'}`);
            console.log(`   Map Location: ${station.mapLocation ? `(${station.mapLocation.lat}, ${station.mapLocation.long})` : 'N/A'}`);

            // Kiểm tra current data
            if (station.currentData) {
                totalCurrentData++;
                console.log(`   ✅ Current Data: Yes`);
                console.log(`   📅 Current Data Time: ${station.currentData.receivedAt}`);
                console.log(`   🔧 Current Data Parameters: ${Object.keys(station.currentData.measuringLogs || {}).length}`);

                // Thu thập parameter keys
                Object.keys(station.currentData.measuringLogs || {}).forEach(key => allParameterKeys.add(key));
            } else {
                console.log(`   ❌ Current Data: No`);
            }

            // Kiểm tra history
            const historyCount = station.history?.length || 0;
            totalHistoryEntries += historyCount;
            console.log(`   📊 History Entries: ${historyCount}`);

            if (historyCount > 0) {
                // Tìm date range
                const timestamps = station.history.map(h => new Date(h.timestamp));
                const earliest = new Date(Math.min(...timestamps));
                const latest = new Date(Math.max(...timestamps));

                if (!dateRange.earliest || earliest < dateRange.earliest) {
                    dateRange.earliest = earliest;
                }
                if (!dateRange.latest || latest > dateRange.latest) {
                    dateRange.latest = latest;
                }

                console.log(`   📅 History Range: ${earliest.toISOString()} to ${latest.toISOString()}`);
                console.log(`   📅 History Days: ${Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24))} days`);

                // Phân tích sample history entry
                const sampleEntry = station.history[0];
                console.log(`   🔧 Sample History Parameters: ${Object.keys(sampleEntry.measuringLogs || {}).length}`);
                console.log(`   📝 Sample Parameters: ${Object.keys(sampleEntry.measuringLogs || {}).join(', ')}`);

                // Thu thập parameter keys từ history
                station.history.forEach(entry => {
                    Object.keys(entry.measuringLogs || {}).forEach(key => allParameterKeys.add(key));
                });

                // Phân tích parameter structure
                if (sampleEntry.measuringLogs) {
                    const paramKeys = Object.keys(sampleEntry.measuringLogs);
                    if (paramKeys.length > 0) {
                        const sampleParam = sampleEntry.measuringLogs[paramKeys[0]];
                        console.log(`   🔍 Sample Parameter Structure:`);
                        console.log(`      Key: ${sampleParam.key || 'N/A'}`);
                        console.log(`      Name: ${sampleParam.name || 'N/A'}`);
                        console.log(`      Unit: ${sampleParam.unit || 'N/A'}`);
                        console.log(`      Value: ${sampleParam.value || 'N/A'}`);
                        console.log(`      Max Limit: ${sampleParam.maxLimit || 'N/A'}`);
                        console.log(`      Min Limit: ${sampleParam.minLimit || 'N/A'}`);
                        console.log(`      Warning Level: ${sampleParam.warningLevel || 'N/A'}`);
                    }
                }
            }

            console.log(`   📅 Created: ${station.createdAt || 'N/A'}`);
            console.log(`   📅 Updated: ${station.updatedAt || 'N/A'}`);
        });

        // Tổng kết
        console.log(`\n📊 PRODUCTION DATA SUMMARY`);
        console.log('========================');
        console.log(`Total Stations: ${totalStations}`);
        console.log(`Stations with Current Data: ${totalCurrentData}`);
        console.log(`Total History Entries: ${totalHistoryEntries}`);
        console.log(`Average History per Station: ${Math.round(totalHistoryEntries / totalStations)}`);
        console.log(`Unique Parameters: ${allParameterKeys.size}`);
        console.log(`Parameter List: ${Array.from(allParameterKeys).join(', ')}`);

        if (dateRange.earliest && dateRange.latest) {
            console.log(`\n📅 DATA TIMELINE`);
            console.log('================');
            console.log(`Earliest Data: ${dateRange.earliest.toISOString()}`);
            console.log(`Latest Data: ${dateRange.latest.toISOString()}`);
            console.log(`Total Timespan: ${Math.ceil((dateRange.latest - dateRange.earliest) / (1000 * 60 * 60 * 24))} days`);
        }

        // Ước tính kích thước dữ liệu
        console.log(`\n💾 SIZE ESTIMATION`);
        console.log('==================');
        const avgHistoryPerStation = totalHistoryEntries / totalStations;
        const estimatedBucketsPerStation = Math.ceil(avgHistoryPerStation / 48); // Giả sử 48 entries per day (30min intervals)
        const totalEstimatedBuckets = totalStations * estimatedBucketsPerStation;

        console.log(`Average History per Station: ${Math.round(avgHistoryPerStation)}`);
        console.log(`Estimated Buckets per Station: ${estimatedBucketsPerStation}`);
        console.log(`Total Estimated Buckets: ${totalEstimatedBuckets}`);

        // Kiểm tra document size
        const sampleStation = sampleStations[0];
        const sampleSize = JSON.stringify(sampleStation).length;
        console.log(`Sample Station Size: ${(sampleSize / 1024).toFixed(2)} KB`);

        if (sampleSize > 16 * 1024 * 1024) {
            console.log(`⚠️  WARNING: Sample station exceeds 16MB limit!`);
        } else {
            console.log(`✅ Sample station is within 16MB limit`);
        }

    } catch (error) {
        console.error('❌ Error checking production data:', error);
        throw error;
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await checkProductionData();

    } catch (error) {
        console.error('❌ Check failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

// Chạy check
if (require.main === module) {
    main();
}

module.exports = { checkProductionData };
