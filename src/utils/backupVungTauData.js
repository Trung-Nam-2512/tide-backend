// Script để backup dữ liệu Vũng Tàu trước khi cập nhật
const mongoose = require('mongoose');
const TideRealy = require('../models/tideRealyModel');
const config = require('../config/config');
const fs = require('fs').promises;
const path = require('path');

// Station code của Vũng Tàu
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

// Hàm backup dữ liệu Vũng Tàu
const backupVungTauData = async () => {
    try {
        console.log('🔄 Bắt đầu backup dữ liệu Vũng Tàu...');
        console.log(`📍 Station Code: ${VUNGTAU_STATION_CODE}`);

        // Tìm tất cả dữ liệu của trạm Vũng Tàu
        const vungTauData = await TideRealy.find({
            stationCode: VUNGTAU_STATION_CODE,
            status: 'active'
        }).lean();

        console.log(`📊 Tìm thấy ${vungTauData.length} records của trạm Vũng Tàu`);

        if (vungTauData.length === 0) {
            console.log('ℹ️ Không có dữ liệu nào của trạm Vũng Tàu để backup');
            return null;
        }

        // Tạo thư mục backup nếu chưa có
        const backupDir = path.join(__dirname, '../../backups');
        try {
            await fs.mkdir(backupDir, { recursive: true });
        } catch (error) {
            // Thư mục đã tồn tại
        }

        // Tạo tên file backup với timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `vungtau-backup-${timestamp}.json`;
        const backupFilePath = path.join(backupDir, backupFileName);

        // Chuẩn bị dữ liệu backup - chuyển đổi thành plain object
        const backupData = {
            metadata: {
                stationCode: VUNGTAU_STATION_CODE,
                backupTime: new Date().toISOString(),
                totalRecords: vungTauData.length,
                description: 'Backup dữ liệu Vũng Tàu trước khi cập nhật (trừ 2.885)'
            },
            data: vungTauData
        };

        // Lưu file backup
        await fs.writeFile(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');

        console.log(`✅ Đã backup thành công: ${backupFilePath}`);
        console.log(`📊 Số lượng records: ${vungTauData.length}`);

        // Hiển thị thống kê
        if (vungTauData.length > 0) {
            const stats = {
                minWaterLevel: Math.min(...vungTauData.map(r => r.waterLevel || 0)),
                maxWaterLevel: Math.max(...vungTauData.map(r => r.waterLevel || 0)),
                avgWaterLevel: vungTauData.reduce((sum, r) => sum + (r.waterLevel || 0), 0) / vungTauData.length
            };

            console.log('\n📈 Thống kê dữ liệu backup:');
            console.log(`  📉 Giá trị nhỏ nhất: ${stats.minWaterLevel.toFixed(2)} cm`);
            console.log(`  📈 Giá trị lớn nhất: ${stats.maxWaterLevel.toFixed(2)} cm`);
            console.log(`  📊 Giá trị trung bình: ${stats.avgWaterLevel.toFixed(2)} cm`);
        }

        return backupFilePath;

    } catch (error) {
        console.error('❌ Lỗi trong quá trình backup:', error.message);
        throw error;
    }
};

// Hàm chính
const main = async () => {
    try {
        console.log('🚀 Bắt đầu backup dữ liệu Vũng Tàu');
        console.log('='.repeat(50));

        // Kết nối database
        await connectDB();

        // Backup dữ liệu
        const backupPath = await backupVungTauData();

        console.log('\n✅ Hoàn thành backup dữ liệu Vũng Tàu');
        if (backupPath) {
            console.log(`📁 File backup: ${backupPath}`);
        }
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
    backupVungTauData,
    VUNGTAU_STATION_CODE
};
