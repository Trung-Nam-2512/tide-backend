#!/usr/bin/env node

/**
 * Script tổng hợp để backup và cập nhật dữ liệu Vũng Tàu
 * 1. Backup dữ liệu hiện tại
 * 2. Cập nhật dữ liệu (trừ 2.885)
 * 
 * Cách sử dụng:
 * node scripts/backup-and-update-vungtau.js
 * hoặc
 * npm run backup-and-update-vungtau
 */

const mongoose = require('mongoose');
const { backupVungTauData } = require('../src/utils/backupVungTauData');
const { updateVungTauData, VUNGTAU_STATION_CODE, ADJUSTMENT_VALUE } = require('../src/utils/updateVungTauData');
const config = require('../src/config/config');

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

console.log('🚀 Script backup và cập nhật dữ liệu Vũng Tàu');
console.log('='.repeat(70));
console.log(`📍 Station Code: ${VUNGTAU_STATION_CODE}`);
console.log(`🔧 Giá trị điều chỉnh: -${ADJUSTMENT_VALUE}`);
console.log('='.repeat(70));

async function backupAndUpdate() {
    try {
        // Kết nối database
        await connectDB();

        // Bước 1: Backup dữ liệu
        console.log('\n📦 Bước 1: Backup dữ liệu hiện tại...');
        const backupPath = await backupVungTauData();
        if (backupPath) {
            console.log(`✅ Backup hoàn thành: ${backupPath}`);
        } else {
            console.log('⚠️ Không có dữ liệu để backup');
        }

        // Bước 2: Cập nhật dữ liệu
        console.log('\n🔄 Bước 2: Cập nhật dữ liệu...');
        await updateVungTauData();
        console.log('✅ Cập nhật hoàn thành');

        console.log('\n🎉 Hoàn thành tất cả các bước!');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('\n❌ Lỗi:', error.message);
        process.exit(1);
    } finally {
        // Đóng kết nối database nếu đã kết nối
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('🔌 Đã đóng kết nối database');
        }
    }
}

// Chạy script
backupAndUpdate();
