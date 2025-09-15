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

// Tạo dữ liệu test với 83 bản ghi history
const createTestDataWith83History = async () => {
    try {
        console.log('🧪 Creating test data with 83 history entries...\n');

        // Xóa dữ liệu cũ
        await BinhDuongModel.deleteMany({});
        console.log('🧹 Cleaned old test data');

        // Tạo test station với 83 history entries
        const testStation = new BinhDuongModel({
            key: 'PROD_TEST_STATION_001',
            name: 'Production Test Station 001',
            address: 'Test Address, Production City',
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
                    },
                    TSS: {
                        key: 'TSS',
                        name: 'Total Suspended Solids',
                        unit: 'mg/L',
                        value: 15.2,
                        maxLimit: 50,
                        minLimit: 0,
                        statusDevice: 1,
                        warningLevel: 'GOOD'
                    },
                    NH4: {
                        key: 'NH4',
                        name: 'Ammonium',
                        unit: 'mg/L',
                        value: 0.8,
                        maxLimit: 2.0,
                        minLimit: 0,
                        statusDevice: 1,
                        warningLevel: 'GOOD'
                    }
                }
            },
            history: []
        });

        // Tạo 83 history entries (mô phỏng production data)
        const historyEntries = [];
        const now = new Date();

        // Tạo dữ liệu cho 83 ngày (mỗi ngày 1 entry)
        for (let day = 0; day < 83; day++) {
            const timestamp = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000));

            // Tạo dữ liệu ngẫu nhiên nhưng realistic
            const baseValues = {
                COD: 20 + Math.random() * 20, // 20-40 mg/L
                pH: 6.5 + Math.random() * 2, // 6.5-8.5
                DO: 4 + Math.random() * 4, // 4-8 mg/L
                TSS: 10 + Math.random() * 30, // 10-40 mg/L
                NH4: 0.5 + Math.random() * 1.5 // 0.5-2.0 mg/L
            };

            historyEntries.push({
                timestamp: timestamp,
                measuringLogs: {
                    COD: {
                        key: 'COD',
                        name: 'Chemical Oxygen Demand',
                        unit: 'mg/L',
                        value: parseFloat(baseValues.COD.toFixed(2)),
                        maxLimit: 50,
                        minLimit: 0,
                        statusDevice: 1,
                        warningLevel: baseValues.COD > 30 ? 'WARNING' : 'GOOD'
                    },
                    pH: {
                        key: 'pH',
                        name: 'pH Level',
                        unit: '',
                        value: parseFloat(baseValues.pH.toFixed(2)),
                        maxLimit: 8.5,
                        minLimit: 6.5,
                        statusDevice: 1,
                        warningLevel: baseValues.pH < 6.5 || baseValues.pH > 8.5 ? 'WARNING' : 'GOOD'
                    },
                    DO: {
                        key: 'DO',
                        name: 'Dissolved Oxygen',
                        unit: 'mg/L',
                        value: parseFloat(baseValues.DO.toFixed(2)),
                        maxLimit: 10,
                        minLimit: 4,
                        statusDevice: 1,
                        warningLevel: baseValues.DO < 4 ? 'WARNING' : 'GOOD'
                    },
                    TSS: {
                        key: 'TSS',
                        name: 'Total Suspended Solids',
                        unit: 'mg/L',
                        value: parseFloat(baseValues.TSS.toFixed(2)),
                        maxLimit: 50,
                        minLimit: 0,
                        statusDevice: 1,
                        warningLevel: baseValues.TSS > 30 ? 'WARNING' : 'GOOD'
                    },
                    NH4: {
                        key: 'NH4',
                        name: 'Ammonium',
                        unit: 'mg/L',
                        value: parseFloat(baseValues.NH4.toFixed(2)),
                        maxLimit: 2.0,
                        minLimit: 0,
                        statusDevice: 1,
                        warningLevel: baseValues.NH4 > 1.5 ? 'WARNING' : 'GOOD'
                    }
                }
            });
        }

        testStation.history = historyEntries;
        await testStation.save();

        console.log(`✅ Created test station with ${historyEntries.length} history entries`);
        console.log(`   Station: ${testStation.key} (${testStation.name})`);
        console.log(`   History entries: ${testStation.history.length}`);
        console.log(`   Current data parameters: ${Object.keys(testStation.currentData.measuringLogs).length}`);
        console.log(`   Date range: ${testStation.history[testStation.history.length - 1].timestamp} to ${testStation.history[0].timestamp}`);

        // Kiểm tra kích thước document
        const docSize = JSON.stringify(testStation).length;
        console.log(`   Document size: ${(docSize / 1024).toFixed(2)} KB`);

        if (docSize > 16 * 1024 * 1024) {
            console.log(`   ⚠️  WARNING: Document exceeds 16MB limit!`);
        } else {
            console.log(`   ✅ Document size is within 16MB limit`);
        }

        return testStation;

    } catch (error) {
        console.error('❌ Error creating test data:', error);
        throw error;
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await createTestDataWith83History();

        console.log('\n🎉 Test data creation completed successfully!');
        console.log('\n📊 Next steps:');
        console.log('1. Run migration: node scripts/migrate-binhduong-data.js');
        console.log('2. Verify results: node scripts/verify-migration.js');
        console.log('3. Test API: node scripts/test-api-endpoints.js');

    } catch (error) {
        console.error('❌ Test data creation failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

// Chạy script
if (require.main === module) {
    main();
}

module.exports = { createTestDataWith83History };
