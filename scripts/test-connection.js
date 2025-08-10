#!/usr/bin/env node

/**
 * Script test kết nối database đơn giản
 */

const mongoose = require('mongoose');
const config = require('../src/config/config');

console.log('🧪 Test kết nối database...');

async function testConnection() {
    try {
        console.log('🔗 Đang kết nối đến MongoDB...');
        console.log(`📍 URL: ${config.mongo.url}`);
        
        await mongoose.connect(config.mongo.url, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log('✅ Kết nối thành công!');
        
        // Test query đơn giản
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log(`📊 Số collections: ${collections.length}`);
        
        collections.forEach(collection => {
            console.log(`  - ${collection.name}`);
        });
        
    } catch (error) {
        console.error('❌ Lỗi kết nối:', error.message);
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('🔌 Đã đóng kết nối');
        }
        process.exit(0);
    }
}

testConnection();
