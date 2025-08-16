const mongoose = require('mongoose');

const mekongSchema = new mongoose.Schema({
    date_gmt: {
        type: Date,
        required: true
    },
    val: {
        type: Number,
        required: true
    },
    ft: {
        type: Number,
        required: false
    },
    as: {
        type: Number,
        required: false
    },
    av: {
        type: Number,
        required: false
    },
    P: {
        type: Number,
        required: false
    },
    lineColor: {
        type: String,
        required: false,
        default: '#0066FF'
    },
    // Station identification fields
    stationCode: {
        type: String,
        required: true,
        enum: ['CDO', 'TCH'], // CDO = Chau Doc, TCH = Tan Chau
        index: true
    },
    stationName: {
        type: String,
        required: true,
        enum: ['ChauDoc', 'TanChau']
    },
    // Metadata fields
    dataType: {
        type: String,
        required: true,
        default: 'mekong'
    },
    source: {
        type: String,
        required: true,
        default: 'mekong_api'
    }
}, {
    timestamps: true,
    collection: 'mekong_data'
});

// Tạo compound index để đảm bảo unique cho date_gmt + stationCode
mekongSchema.index({ date_gmt: 1, stationCode: 1 }, { unique: true });

// Index cho việc query theo thời gian
mekongSchema.index({ date_gmt: 1, val: 1 });

const Mekong = mongoose.model('Mekong', mekongSchema);

module.exports = Mekong;
