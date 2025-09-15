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

// Kiểm tra tất cả dữ liệu trong old schema
const checkAllOldSchema = async () => {
    try {
        console.log('🔍 Checking all data in old schema (binhduongstations)...\n');

        const allStations = await BinhDuongModel.find({});
        console.log(`📊 Total stations in old schema: ${allStations.length}`);

        if (allStations.length === 0) {
            console.log('⚠️  No stations found in old schema');
            return;
        }

        let totalHistoryEntries = 0;
        let stationsWithManyHistory = 0;

        allStations.forEach((station, index) => {
            const historyCount = station.history?.length || 0;
            totalHistoryEntries += historyCount;

            console.log(`\n🏢 Station ${index + 1}: ${station.key}`);
            console.log(`   Name: ${station.name}`);
            console.log(`   History Entries: ${historyCount}`);
            console.log(`   Current Data: ${station.currentData ? 'Yes' : 'No'}`);

            if (historyCount >= 80) {
                stationsWithManyHistory++;
                console.log(`   *** This station has 80+ history entries! ***`);
            }

            if (historyCount > 0) {
                console.log(`   📅 History Range: ${station.history[0].timestamp} to ${station.history[historyCount - 1].timestamp}`);
                console.log(`   📅 History Days: ${Math.ceil((new Date(station.history[historyCount - 1].timestamp) - new Date(station.history[0].timestamp)) / (1000 * 60 * 60 * 24))} days`);

                // Phân tích sample history entry
                const sampleEntry = station.history[0];
                console.log(`   🔧 Sample History Parameters: ${Object.keys(sampleEntry.measuringLogs || {}).length}`);
                console.log(`   📝 Sample Parameters: ${Object.keys(sampleEntry.measuringLogs || {}).join(', ')}`);
            }
        });

        // Tổng kết
        console.log(`\n📊 OLD SCHEMA SUMMARY`);
        console.log('===================');
        console.log(`Total Stations: ${allStations.length}`);
        console.log(`Total History Entries: ${totalHistoryEntries}`);
        console.log(`Average History per Station: ${Math.round(totalHistoryEntries / allStations.length)}`);
        console.log(`Stations with 80+ History: ${stationsWithManyHistory}`);

        // Kiểm tra kích thước document
        if (allStations.length > 0) {
            const sampleStation = allStations[0];
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

        // Kiểm tra xem có cần migration không
        console.log(`\n🔄 MIGRATION STATUS`);
        console.log('==================');
        if (stationsWithManyHistory > 0) {
            console.log(`⚠️  Found ${stationsWithManyHistory} stations with 80+ history entries`);
            console.log(`   These stations should be migrated to new schema`);
        } else {
            console.log(`✅ No stations with excessive history found`);
            console.log(`   Migration may not be necessary`);
        }

    } catch (error) {
        console.error('❌ Error checking all old schema:', error);
        throw error;
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await checkAllOldSchema();

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

module.exports = { checkAllOldSchema };
