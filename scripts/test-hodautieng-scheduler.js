/**
 * Test script để kiểm tra HoDauTieng Scheduler
 * Chạy: node scripts/test-hodautieng-scheduler.js
 */

const { fetchHoDauTiengDataNow, getHoDauTiengSchedulerStatus } = require('../src/scheduler/hodautiengScheduler');
const connectDB = require('../src/dbs/mongo.init');

const testHoDauTiengScheduler = async () => {
    console.log('🧪 Test HoDauTieng Scheduler');
    console.log('=====================================');

    try {
        // Kết nối database
        console.log('📡 Kết nối database...');
        await connectDB();
        console.log('✅ Database connected');

        // Test 1: Kiểm tra status
        console.log('\n1️⃣ Test: Kiểm tra scheduler status...');
        const status = getHoDauTiengSchedulerStatus();
        console.log('📊 Scheduler Status:', JSON.stringify(status, null, 2));

        // Test 2: Manual fetch
        console.log('\n2️⃣ Test: Manual fetch dữ liệu Hồ Dầu Tiếng...');
        const result = await fetchHoDauTiengDataNow();

        console.log('\n📊 Kết quả fetch:');
        console.log(`✅ Success: ${result.success}`);
        console.log(`📈 Total Records: ${result.totalRecords}`);
        console.log(`🎯 Success Count: ${result.successCount}/${result.results.length}`);
        console.log(`⏰ Timestamp: ${result.timestamp}`);

        console.log('\n📋 Chi tiết từng loại dữ liệu:');
        result.results.forEach((item, index) => {
            const icon = item.success ? '✅' : '❌';
            console.log(`  ${icon} ${item.type}: ${item.newRecords || 0} records ${item.success ? 'thành công' : `lỗi - ${item.error || item.message}`}`);
        });

        // Test 3: Kiểm tra dữ liệu trong database
        console.log('\n3️⃣ Test: Kiểm tra dữ liệu trong database...');

        const Mucnuocho = require('../src/models/mucnuochoModel');
        const Qden = require('../src/models/qDenModel');
        const Luuluongxa = require('../src/models/luuluongxaModel');

        const [mucnuochoCount, qdenCount, luuluongxaCount] = await Promise.all([
            Mucnuocho.countDocuments(),
            Qden.countDocuments(),
            Luuluongxa.countDocuments()
        ]);

        console.log(`📊 Mucnuocho (Mực nước hồ): ${mucnuochoCount} records`);
        console.log(`💧 Qden (Lưu lượng nước): ${qdenCount} records`);
        console.log(`🚰 Luuluongxa (Lưu lượng xả): ${luuluongxaCount} records`);
        console.log(`📈 Tổng cộng: ${mucnuochoCount + qdenCount + luuluongxaCount} records`);

        // Test 4: Lấy mẫu dữ liệu gần nhất
        console.log('\n4️⃣ Test: Lấy mẫu dữ liệu gần nhất...');

        const [latestMucnuocho, latestQden, latestLuuluongxa] = await Promise.all([
            Mucnuocho.findOne().sort({ data_thoigian: -1 }),
            Qden.findOne().sort({ data_thoigian: -1 }),
            Luuluongxa.findOne().sort({ data_thoigian: -1 })
        ]);

        if (latestMucnuocho) {
            console.log(`📊 Mực nước hồ mới nhất: ${latestMucnuocho.mucnuocho} ${latestMucnuocho.unit} (${new Date(latestMucnuocho.data_thoigian).toLocaleString('vi-VN')})`);
        }

        if (latestQden) {
            console.log(`💧 Lưu lượng nước mới nhất: ${latestQden.qden} ${latestQden.unit} (${new Date(latestQden.data_thoigian).toLocaleString('vi-VN')})`);
        }

        if (latestLuuluongxa) {
            console.log(`🚰 Lưu lượng xả mới nhất: ${latestLuuluongxa.luuluongxa} ${latestLuuluongxa.unit} (${new Date(latestLuuluongxa.data_thoigian).toLocaleString('vi-VN')})`);
        }

        console.log('\n🎉 Test completed successfully!');
        console.log('=====================================');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        // Đóng kết nối database
        setTimeout(() => {
            process.exit(0);
        }, 2000);
    }
};

// Chạy test
testHoDauTiengScheduler();
