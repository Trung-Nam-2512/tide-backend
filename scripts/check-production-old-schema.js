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

// Kiểm tra dữ liệu production trong old schema
const checkProductionOldSchema = async () => {
    try {
        console.log('🔍 Checking production data in old schema...\n');

        // Tìm kiếm production stations
        const productionKeys = ['bdtvtunuodna_1', 'BD_TVSG_NUOTSG', 'BD_VNTT_NUOSTT', 'BD_TD01_NUOTDM', 'BD_THNM_NUOTHI', 'BD_TVTU_NUOTVT'];

        const productionStations = await BinhDuongModel.find({
            key: { $in: productionKeys }
        });

        console.log(`📊 Production stations in old schema: ${productionStations.length}`);

        if (productionStations.length === 0) {
            console.log('⚠️  No production stations found in old schema');
            console.log('This means production data is only in new schema (V2)');
            return;
        }

        let totalHistoryEntries = 0;

        productionStations.forEach((station, index) => {
            console.log(`\n🏢 Production Station ${index + 1}: ${station.key}`);
            console.log(`   Name: ${station.name}`);
            console.log(`   History Entries: ${station.history?.length || 0}`);
            console.log(`   Current Data: ${station.currentData ? 'Yes' : 'No'}`);

            const historyCount = station.history?.length || 0;
            totalHistoryEntries += historyCount;

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
        console.log(`\n📊 PRODUCTION OLD SCHEMA SUMMARY`);
        console.log('=================================');
        console.log(`Total Production Stations: ${productionStations.length}`);
        console.log(`Total History Entries: ${totalHistoryEntries}`);
        console.log(`Average History per Station: ${Math.round(totalHistoryEntries / productionStations.length)}`);

        // Kiểm tra kích thước document
        if (productionStations.length > 0) {
            const sampleStation = productionStations[0];
            const docSize = JSON.stringify(sampleStation).length;
            console.log(`\n💾 DOCUMENT SIZE ANALYSIS`);
            console.log('========================');
            console.log(`Sample Production Station Size: ${(docSize / 1024).toFixed(2)} KB`);

            if (docSize > 16 * 1024 * 1024) {
                console.log(`⚠️  WARNING: Production station exceeds 16MB limit!`);
            } else {
                console.log(`✅ Production station is within 16MB limit`);
            }
        }

    } catch (error) {
        console.error('❌ Error checking production old schema:', error);
        throw error;
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await checkProductionOldSchema();

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

module.exports = { checkProductionOldSchema };
