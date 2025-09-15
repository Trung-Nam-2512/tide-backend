/**
 * Forecast Data Model - Schema đơn giản cho dữ liệu dự báo
 */

const mongoose = require('mongoose');

const forecastDataSchema = new mongoose.Schema({
    // Thông tin cơ bản
    hc_uuid: {
        type: String,
        required: true,
        trim: true
    },
    parameter_type: {
        type: String,
        required: true,
        enum: ['MUCNUOCHO', 'QDEN', 'QXA', 'RAINFALL']
    },
    timestamp: {
        type: Date,
        required: true
    },
    value: {
        type: Number,
        required: true
    },
    data_source: {
        type: String,
        required: true,
        enum: ['realtime', 'forecast', 'manual'],
        default: 'realtime'
    },
    
    // Thông tin dự báo (chỉ khi data_source = 'forecast')
    forecast_horizon: {
        type: Number,
        min: 0,
        default: 0
    },
    
    // Raw data từ API (optional)
    raw_data: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true,
    versionKey: false,
    collection: 'forecast_data'
});

// Essential indexes only
forecastDataSchema.index({ 
    hc_uuid: 1, 
    parameter_type: 1, 
    timestamp: 1, 
    data_source: 1 
}, { unique: true });

forecastDataSchema.index({ hc_uuid: 1, timestamp: -1 });
forecastDataSchema.index({ timestamp: -1 });

// Basic validation
forecastDataSchema.pre('save', function(next) {
    // Auto-set forecast_horizon for forecast data
    if (this.data_source === 'forecast' && this.forecast_horizon === 0) {
        const now = new Date();
        this.forecast_horizon = Math.max(0, Math.round(
            (this.timestamp.getTime() - now.getTime()) / (1000 * 60 * 60)
        ));
    }
    next();
});



module.exports = mongoose.model('ForecastData', forecastDataSchema);