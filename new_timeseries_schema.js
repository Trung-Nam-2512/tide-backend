/**
 * NEW OPTIMIZED TIMESERIES SCHEMA DESIGN
 * Thiết kế tối ưu cho lưu trữ dài hạn (vĩnh viễn)
 */

const mongoose = require('mongoose');

// ==================== COLLECTION 1: STATION METADATA ====================
const stationMetadataSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: { type: String, required: true },
    address: { type: String },
    mapLocation: {
        lat: { type: Number },
        long: { type: Number }
    },
    province: { type: Object },
    stationType: {
        _id: { type: String },
        key: { type: String },
        name: { type: String }
    },
    // Parameters metadata
    parameters: [{
        key: { type: String, required: true },     // COD, pH, DO, etc.
        name: { type: String, required: true },    // Tên hiển thị
        unit: { type: String },                    // mg/L, pH, °C
        maxLimit: { type: Number },
        minLimit: { type: Number },
        dataType: { type: String, default: 'number' }
    }],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    collection: 'station_metadata_v2'
});

// ==================== COLLECTION 2: CURRENT DATA ====================
const currentDataSchema = new mongoose.Schema({
    stationKey: {
        type: String,
        required: true,
        index: true
    },
    receivedAt: { type: Date, required: true, index: true },
    data: { type: Schema.Types.Mixed, required: true }, // { COD: 15.2, pH: 7.1, ... }
    rawData: { type: Schema.Types.Mixed }, // Dữ liệu gốc từ API
    status: { type: String, default: 'active' },
    updatedAt: { type: Date, default: Date.now }
}, {
    collection: 'current_data_v2'
});

// ==================== COLLECTION 3: TIMESERIES BUCKETS ====================
const timeseriesBucketSchema = new mongoose.Schema({
    stationKey: {
        type: String,
        required: true,
        index: true
    },
    bucketDate: {
        type: Date,
        required: true,
        index: true
    }, // YYYY-MM-DD 00:00:00 (daily bucket)

    // Array chứa measurements của 1 ngày (tối đa 48 entries với 30min interval)
    measurements: [{
        timestamp: { type: Date, required: true },
        data: { type: Schema.Types.Mixed, required: true }, // { COD: 15.2, pH: 7.1 }
        quality: { type: String, default: 'good' }, // good, warning, error
        _id: false // Disable _id cho sub-documents
    }],

    // Metadata
    count: { type: Number, default: 0 }, // Số measurements trong bucket
    dataHash: { type: String }, // Hash để check integrity
    compressed: { type: Boolean, default: false }, // Flag cho compression
    archived: { type: Boolean, default: false }, // Flag cho archiving

    // Statistics (optional - cho performance)
    stats: {
        parameters: { type: Schema.Types.Mixed } // Pre-calculated stats
    }
}, {
    collection: 'timeseries_buckets_v2',
    timestamps: true
});

// Compound indexes cho performance tối ưu
timeseriesBucketSchema.index({ stationKey: 1, bucketDate: 1 }, { unique: true });
timeseriesBucketSchema.index({ bucketDate: 1, archived: 1 });
timeseriesBucketSchema.index({ stationKey: 1, 'measurements.timestamp': 1 });

// ==================== MODELS ====================
const StationMetadataV2 = mongoose.model('StationMetadataV2', stationMetadataSchema);
const CurrentDataV2 = mongoose.model('CurrentDataV2', currentDataSchema);
const TimeseriesBucketV2 = mongoose.model('TimeseriesBucketV2', timeseriesBucketSchema);

module.exports = {
    StationMetadataV2,
    CurrentDataV2,
    TimeseriesBucketV2
};

/**
 * ADVANTAGES OF NEW SCHEMA:
 *
 * 1. SCALABILITY:
 *    - Unlimited time storage (no 16MB limit)
 *    - 1 bucket = 1 day = ~48 entries max = ~5KB document
 *    - Can store 100+ years of data easily
 *
 * 2. PERFORMANCE:
 *    - Query specific date ranges efficiently
 *    - Index on (stationKey + bucketDate) = O(log n) lookup
 *    - Only load needed documents, not entire history
 *
 * 3. MAINTENANCE:
 *    - Can archive old data (>2 years) to cold storage
 *    - Can compress old buckets
 *    - Easy to implement data retention policies
 *
 * 4. ANALYTICS:
 *    - Efficient aggregation queries
 *    - Pre-calculated statistics
 *    - Research-friendly structure
 *
 * 5. RELIABILITY:
 *    - Data integrity with hashing
 *    - Separate current data for real-time access
 *    - Station metadata separate from time data
 */