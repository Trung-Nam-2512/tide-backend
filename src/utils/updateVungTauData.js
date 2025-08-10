// Script để cập nhật giá trị cũ của trạm Vũng Tàu
// Trừ đi 2.885 từ tất cả các giá trị waterLevel của trạm Vũng Tàu

const mongoose = require('mongoose');
const TideRealy = require('../models/tideRealyModel');
const config = require('../config/config');

// Station code của Vũng Tàu
const VUNGTAU_STATION_CODE = '4EC7BBAF-44E7-4DFA-BAED-4FB1217FBDA8';
const ADJUSTMENT_VALUE = 2.885;

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

// Hàm cập nhật dữ liệu Vũng Tàu (sử dụng bulk update)
const updateVungTauData = async () => {
    try {
        console.log('🔄 Bắt đầu cập nhật dữ liệu Vũng Tàu...');
        console.log(`📍 Station Code: ${VUNGTAU_STATION_CODE}`);
        console.log(`🔧 Giá trị điều chỉnh: -${ADJUSTMENT_VALUE}`);

        // Tìm tất cả records trước để đếm
        const allRecords = await TideRealy.find({
            stationCode: VUNGTAU_STATION_CODE,
            status: 'active'
        }).select('_id').lean();

        const totalRecords = allRecords.length;
        console.log(`📊 Tìm thấy ${totalRecords} records của trạm Vũng Tàu`);

        if (totalRecords === 0) {
            console.log('ℹ️ Không có dữ liệu nào của trạm Vũng Tàu để cập nhật');
            return;
        }

        // Sử dụng bulk update để tối ưu hiệu suất
        const result = await TideRealy.updateMany(
            {
                stationCode: VUNGTAU_STATION_CODE,
                status: 'active'
            },
            {
                $inc: { waterLevel: -ADJUSTMENT_VALUE },
                $set: { updatedAt: new Date() }
            }
        );

        console.log('\n📊 Kết quả cập nhật:');
        console.log(`✅ Đã cập nhật thành công: ${result.modifiedCount} records`);
        console.log(`📈 Tổng số records: ${totalRecords}`);

        // Hiển thị một số ví dụ sau khi cập nhật
        const sampleRecords = await TideRealy.find({
            stationCode: VUNGTAU_STATION_CODE,
            status: 'active'
        }).limit(5).sort({ updatedAt: -1 });

        console.log('\n🔍 Mẫu dữ liệu sau khi cập nhật:');
        sampleRecords.forEach((record, index) => {
            console.log(`  ${index + 1}. Timestamp: ${record.timestamp}, Water Level: ${record.waterLevel} cm`);
        });

        // Hiển thị thống kê bằng cách tính toán thủ công
        const updatedRecords = await TideRealy.find({
            stationCode: VUNGTAU_STATION_CODE,
            status: 'active'
        }).select('waterLevel').lean();

        if (updatedRecords.length > 0) {
            const waterLevels = updatedRecords.map(r => r.waterLevel || 0);
            const minWaterLevel = Math.min(...waterLevels);
            const maxWaterLevel = Math.max(...waterLevels);
            const avgWaterLevel = waterLevels.reduce((sum, level) => sum + level, 0) / waterLevels.length;

            console.log('\n📈 Thống kê sau khi cập nhật:');
            console.log(`  📊 Số lượng records: ${updatedRecords.length}`);
            console.log(`  📉 Giá trị nhỏ nhất: ${minWaterLevel.toFixed(2)} cm`);
            console.log(`  📈 Giá trị lớn nhất: ${maxWaterLevel.toFixed(2)} cm`);
            console.log(`  📊 Giá trị trung bình: ${avgWaterLevel.toFixed(2)} cm`);
        }

    } catch (error) {
        console.error('❌ Lỗi trong quá trình cập nhật:', error.message);
        throw error;
    }
};

// Hàm chính
const main = async () => {
    try {
        console.log('🚀 Bắt đầu script cập nhật dữ liệu Vũng Tàu');
        console.log('='.repeat(50));

        // Kết nối database
        await connectDB();

        // Cập nhật dữ liệu
        await updateVungTauData();

        console.log('\n✅ Hoàn thành cập nhật dữ liệu Vũng Tàu');
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

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
    main();
}

module.exports = {
    updateVungTauData,
    VUNGTAU_STATION_CODE,
    ADJUSTMENT_VALUE
};