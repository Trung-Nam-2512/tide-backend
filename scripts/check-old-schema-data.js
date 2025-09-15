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

// Kiểm tra dữ liệu old schema
const checkOldSchemaData = async () => {
    try {
        console.log('🔍 Checking old schema (binhduongstations) data...\n');

        const oldStations = await BinhDuongModel.find({});
        console.log(`📊 Old schema stations count: ${oldStations.length}`);

        if (oldStations.length === 0) {
            console.log('⚠️  No stations found in old schema');
            return;
        }

        let totalHistoryEntries = 0;
        let totalCurrentData = 0;

        oldStations.forEach((station, index) => {
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
            } else {
                console.log(`   ❌ Current Data: No`);
            }

            // Kiểm tra history
            const historyCount = station.history?.length || 0;
            totalHistoryEntries += historyCount;
            console.log(`   📊 History Entries: ${historyCount}`);

            if (historyCount > 0) {
                console.log(`   📅 History Range: ${station.history[0].timestamp} to ${station.history[historyCount - 1].timestamp}`);
                console.log(`   📅 History Days: ${Math.ceil((new Date(station.history[historyCount - 1].timestamp) - new Date(station.history[0].timestamp)) / (1000 * 60 * 60 * 24))} days`);

                // Phân tích sample history entry
                const sampleEntry = station.history[0];
                console.log(`   🔧 Sample History Parameters: ${Object.keys(sampleEntry.measuringLogs || {}).length}`);
                console.log(`   📝 Sample Parameters: ${Object.keys(sampleEntry.measuringLogs || {}).join(', ')}`);

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
        console.log(`\n📊 OLD SCHEMA SUMMARY`);
        console.log('===================');
        console.log(`Total Stations: ${oldStations.length}`);
        console.log(`Stations with Current Data: ${totalCurrentData}`);
        console.log(`Total History Entries: ${totalHistoryEntries}`);
        console.log(`Average History per Station: ${Math.round(totalHistoryEntries / oldStations.length)}`);

        // Kiểm tra kích thước document
        if (oldStations.length > 0) {
            const sampleStation = oldStations[0];
            const docSize = JSON.stringify(sampleStation).length;
            console.log(`\n💾 DOCUMENT SIZE ANALYSIS`);
            console.log('========================');
            console.log(`Sample Station Size: ${(docSize / 1024).toFixed(2)} KB`);

            if (docSize > 16 * 1024 * 1024) {
                console.log(`⚠️  WARNING: Sample station exceeds 16MB limit!`);
            } else {
                console.log(`✅ Sample station is within 16MB limit`);
            }
        }

    } catch (error) {
        console.error('❌ Error checking old schema data:', error);
        throw error;
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await checkOldSchemaData();

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

module.exports = { checkOldSchemaData };
