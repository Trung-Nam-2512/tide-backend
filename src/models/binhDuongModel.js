const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const binhDuongSchema = new Schema({
    key: { type: String, required: true, unique: true }, // Unique index để tránh duplicate key
    name: { type: String, required: true },
    address: { type: String },
    mapLocation: {
        long: { type: Number },
        lat: { type: Number }
    },
    province: { type: Object },
    stationType: {
        _id: { type: String },
        key: { type: String },
        name: { type: String }
    },
    receivedAt: { type: Date, required: true, index: true }, // Index cho query timestamps
    measuringLogs: { type: Object, required: true }
}, {
    timestamps: true
});

// Tạo unique index (nếu cần thủ công, nhưng unique: true đã tự động tạo)
binhDuongSchema.index({ key: 1 }, { unique: true });

const BinhDuongModel = mongoose.model('BinhDuongStation', binhDuongSchema);

module.exports = BinhDuongModel;