// src/models/binhDuongModel.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Định nghĩa schema cho từng bản ghi lịch sử
const measuringLogSchema = new Schema({
    timestamp: { type: Date, required: true }, // Thời gian ghi nhận
    value: { type: Number, required: true },   // Giá trị (sau khi format)
    unit: { type: String },                    // Đơn vị (mg/L, oC, v.v.)
    warningLevel: { type: String }             // Trạng thái (GOOD, EXCEEDED)
});

// Schema cho trạm Bình Dương
const binhDuongSchema = new Schema({
    key: { type: String, required: true, unique: true }, // Khóa duy nhất của trạm
    name: { type: String, required: true },              // Tên trạm
    address: { type: String },                           // Địa chỉ
    mapLocation: {
        long: { type: Number },                            // Kinh độ
        lat: { type: Number }                              // Vĩ độ
    },
    province: { type: Object },                          // Tỉnh (nếu có)
    stationType: {
        _id: { type: String },
        key: { type: String },
        name: { type: String }
    },
    currentData: {                                       // Dữ liệu mới nhất
        receivedAt: { type: Date, required: true },        // Thời gian nhận dữ liệu
        measuringLogs: { type: Object, required: true }    // Các thông số mới nhất
    },
    history: [measuringLogSchema]                        // Lịch sử dữ liệu
}, {
    timestamps: true                                      // Tự động thêm createdAt, updatedAt
});

// Format số thập phân khi lưu để tránh lỗi float
binhDuongSchema.pre('save', function (next) {
    if (this.currentData?.measuringLogs) {
        Object.values(this.currentData.measuringLogs).forEach(log => {
            if (typeof log.value === 'number') {
                log.value = parseFloat(log.value.toFixed(2)); // Giới hạn 2 chữ số thập phân
            }
        });
    }
    next();
});

const BinhDuongModel = mongoose.model('BinhDuongStation', binhDuongSchema);
module.exports = BinhDuongModel;