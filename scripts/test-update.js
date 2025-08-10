#!/usr/bin/env node

/**
 * Script test để kiểm tra script cập nhật dữ liệu Vũng Tàu
 * Chỉ hiển thị thông tin mà không thực hiện cập nhật
 */

const mongoose = require('mongoose');
const TideRealy = require('../src/models/tideRealyModel');
const config = require('../src/config/config');

const VUNGTAU_STATION_CODE = '4EC7BBAF-44E7-4DFA-BAED-4FB1217FBDA8';

// Kết nối database
const connectDB = async () => {
    try {
        // Kiểm tra xem đã kết nối chưa
        if (mongoose.connection.readyState === 1) {
            console.log('✅ Đã kết nối MongoDB');
            return;
        }

        // Kết nối mới với timeout dài hơn
        await mongoose.connect(config.mongo.url, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 60000,
            maxPoolSize: 10
        });
        console.log('✅ Đã kết nối MongoDB thành công');
    } catch (error) {
        console.error('❌ Lỗi kết nối MongoDB:', error.message);
        process.exit(1);
    }
};

// Hàm test
const testUpdate = async () => {
    try {
        console.log('🧪 Bắt đầu test script cập nhật dữ liệu Vũng Tàu...');
        console.log(`📍 Station Code: ${VUNGTAU_STATION_CODE}`);

        // Tìm tất cả records để đếm
        const allRecords = await TideRealy.find({
            stationCode: VUNGTAU_STATION_CODE,
            status: 'active'
        }).select('_id').lean();

        const totalRecords = allRecords.length;
        console.log(`📊 Tìm thấy ${totalRecords} records của trạm Vũng Tàu`);

        if (totalRecords === 0) {
            console.log('ℹ️ Không có dữ liệu nào của trạm Vũng Tàu');
            return;
        }

        // Hiển thị một số ví dụ
        const sampleRecords = await TideRealy.find({
            stationCode: VUNGTAU_STATION_CODE,
            status: 'active'
        }).limit(5).sort({ updatedAt: -1 });

        console.log('\n🔍 Mẫu dữ liệu hiện tại:');
        sampleRecords.forEach((record, index) => {
            console.log(`  ${index + 1}. Timestamp: ${record.timestamp}, Water Level: ${record.waterLevel} cm`);
        });

        // Hiển thị thống kê bằng cách tính toán thủ công
        const recordsForStats = await TideRealy.find({
            stationCode: VUNGTAU_STATION_CODE,
            status: 'active'
        }).select('waterLevel').lean();

        if (recordsForStats.length > 0) {
            const waterLevels = recordsForStats.map(r => r.waterLevel || 0);
            const minWaterLevel = Math.min(...waterLevels);
            const maxWaterLevel = Math.max(...waterLevels);
            const avgWaterLevel = waterLevels.reduce((sum, level) => sum + level, 0) / waterLevels.length;

            console.log('\n📈 Thống kê hiện tại:');
            console.log(`  📊 Số lượng records: ${recordsForStats.length}`);
            console.log(`  📉 Giá trị nhỏ nhất: ${minWaterLevel.toFixed(2)} cm`);
            console.log(`  📈 Giá trị lớn nhất: ${maxWaterLevel.toFixed(2)} cm`);
            console.log(`  📊 Giá trị trung bình: ${avgWaterLevel.toFixed(2)} cm`);
        }

        console.log('\n✅ Test hoàn thành - Không có thay đổi nào được thực hiện');

    } catch (error) {
        console.error('❌ Lỗi trong quá trình test:', error.message);
        throw error;
    }
};

// Hàm chính
const main = async () => {
    try {
        console.log('🚀 Bắt đầu test script');
        console.log('='.repeat(50));

        // Kết nối database
        await connectDB();

        // Test
        await testUpdate();

        console.log('\n✅ Hoàn thành test');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        // Đóng kết nối database nếu đã kết nối
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('🔌 Đã đóng kết nối database');
        }
        process.exit(0);
    }
};

// Chạy script
main();
