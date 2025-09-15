const mongoose = require('mongoose');
const { TimeseriesBucketV2 } = require('../src/models/new_timeseries_schema');

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

// Debug history query
const debugHistoryQuery = async () => {
    try {
        console.log('🔍 Debugging history query...\n');

        const stationKey = 'PROD_TEST_STATION_001';
        const startDate = new Date('2025-06-01T00:00:00.000Z');
        const endDate = new Date('2025-09-30T23:59:59.999Z');

        console.log('Query parameters:');
        console.log(`  Station Key: ${stationKey}`);
        console.log(`  Start Date: ${startDate}`);
        console.log(`  End Date: ${endDate}`);

        // Test 1: Get all buckets for this station
        console.log('\n📊 Test 1: Get all buckets for station');
        const allBuckets = await TimeseriesBucketV2.find({ stationKey: stationKey }).sort({ bucketDate: 1 });
        console.log(`  Total buckets: ${allBuckets.length}`);

        if (allBuckets.length > 0) {
            console.log(`  Date range: ${allBuckets[0].bucketDate} to ${allBuckets[allBuckets.length - 1].bucketDate}`);
            console.log(`  Sample measurements: ${allBuckets[0].measurements.length}`);
        }

        // Test 2: Query with date range
        console.log('\n📊 Test 2: Query with date range');
        const queryStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const queryEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

        console.log(`  Query start: ${queryStart}`);
        console.log(`  Query end: ${queryEnd}`);

        const buckets = await TimeseriesBucketV2.find({
            stationKey: stationKey,
            bucketDate: {
                $gte: queryStart,
                $lte: queryEnd
            }
        }).sort({ bucketDate: 1 });

        console.log(`  Buckets found: ${buckets.length}`);

        if (buckets.length > 0) {
            console.log(`  Sample bucket date: ${buckets[0].bucketDate}`);
            console.log(`  Sample measurements: ${buckets[0].measurements.length}`);
        }

        // Test 3: Check measurements within time range
        console.log('\n📊 Test 3: Check measurements within time range');
        let totalMeasurements = 0;
        let validMeasurements = 0;

        buckets.forEach(bucket => {
            bucket.measurements.forEach(measurement => {
                totalMeasurements++;
                const measurementTime = new Date(measurement.timestamp);
                if (measurementTime >= startDate && measurementTime <= endDate) {
                    validMeasurements++;
                }
            });
        });

        console.log(`  Total measurements in buckets: ${totalMeasurements}`);
        console.log(`  Valid measurements in time range: ${validMeasurements}`);

        // Test 4: Sample measurement data
        if (buckets.length > 0 && buckets[0].measurements.length > 0) {
            console.log('\n📊 Test 4: Sample measurement data');
            const sampleMeasurement = buckets[0].measurements[0];
            console.log(`  Timestamp: ${sampleMeasurement.timestamp}`);
            console.log(`  Data keys: ${Object.keys(sampleMeasurement.data || {})}`);
            console.log(`  Quality: ${sampleMeasurement.quality}`);
        }

    } catch (error) {
        console.error('❌ Debug failed:', error);
        throw error;
    }
};

// Main execution
const main = async () => {
    try {
        await connectDB();
        await debugHistoryQuery();

    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

// Chạy debug
if (require.main === module) {
    main();
}

module.exports = { debugHistoryQuery };
