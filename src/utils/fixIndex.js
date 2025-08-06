const mongoose = require('mongoose');
const Tide = require('../models/tideModel');
const config = require('../config/config');

async function fixIndex() {
    try {
        console.log('🔧 Starting index fix...');

        // Connect to MongoDB
        await mongoose.connect(config.mongo.url);
        console.log('✅ Connected to MongoDB');

        // Get the collection
        const collection = mongoose.connection.collection('tides');

        // Drop existing indexes
        console.log('🗑️ Dropping existing indexes...');
        await collection.dropIndexes();
        console.log('✅ Dropped all existing indexes');

        // Create new compound index
        console.log('🔨 Creating new compound index...');
        await collection.createIndex({ date: 1, location: 1 }, { unique: true });
        console.log('✅ Created compound index on { date: 1, location: 1 }');

        // List all indexes to verify
        const indexes = await collection.indexes();
        console.log('📋 Current indexes:', indexes.map(idx => idx.name));

        console.log('🎉 Index fix completed successfully!');

    } catch (error) {
        console.error('❌ Error fixing index:', error.message);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the fix if this file is executed directly
if (require.main === module) {
    fixIndex()
        .then(() => {
            console.log('✅ Index fix completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Index fix failed:', error);
            process.exit(1);
        });
}

module.exports = fixIndex; 