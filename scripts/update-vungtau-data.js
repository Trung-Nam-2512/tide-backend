#!/usr/bin/env node

/**
 * Script để cập nhật giá trị cũ của trạm Vũng Tàu
 * Trừ đi 2.885 từ tất cả các giá trị waterLevel của trạm Vũng Tàu
 * 
 * Cách sử dụng:
 * node scripts/update-vungtau-data.js
 * hoặc
 * npm run update-vungtau-data
 */

const path = require('path');
const { updateVungTauData, VUNGTAU_STATION_CODE, ADJUSTMENT_VALUE } = require('../src/utils/updateVungTauData');

console.log('🚀 Script cập nhật dữ liệu Vũng Tàu');
console.log('='.repeat(60));
console.log(`📍 Station Code: ${VUNGTAU_STATION_CODE}`);
console.log(`🔧 Giá trị điều chỉnh: -${ADJUSTMENT_VALUE}`);
console.log('='.repeat(60));

// Chạy cập nhật
updateVungTauData()
    .then(() => {
        console.log('\n✅ Hoàn thành cập nhật dữ liệu Vũng Tàu');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Lỗi:', error.message);
        process.exit(1);
    });
