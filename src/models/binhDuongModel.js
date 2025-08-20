// src/models/binhDuongModel.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema cho một parameter đo đạc
const parameterSchema = new Schema({
    key: { type: String, required: true },        // Khóa parameter (COD, pH, DO...)
    name: { type: String, required: true },       // Tên hiển thị
    unit: { type: String },                       // Đơn vị (mg/L, oC...)
    value: { type: Number, required: true },      // Giá trị đo được
    maxLimit: { type: Number },                   // Giới hạn tối đa
    minLimit: { type: Number },                   // Giới hạn tối thiểu
    statusDevice: { type: Number, default: 0 },   // Trạng thái thiết bị
    warningLevel: { type: String, default: 'GOOD' } // Mức cảnh báo
}, { _id: false });

// Schema cho lịch sử đo đạc
const historyLogSchema = new Schema({
    timestamp: { type: Date, required: true },    // Thời gian ghi nhận
    measuringLogs: { type: Schema.Types.Mixed } // Object chứa các parameter
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
        measuringLogs: { type: Schema.Types.Mixed }        // Object chứa các parameter từ API
    },
    history: [historyLogSchema]                          // Lịch sử dữ liệu theo timestamp
}, {
    timestamps: true                                      // Tự động thêm createdAt, updatedAt
});

// Middleware để format số thập phân và validate dữ liệu
binhDuongSchema.pre('save', function (next) {
    // Format currentData measuringLogs
    if (this.currentData?.measuringLogs) {
        Object.values(this.currentData.measuringLogs).forEach(log => {
            if (typeof log.value === 'number') {
                log.value = parseFloat(log.value.toFixed(2));
            }
        });
    }

    // Format history measuringLogs
    if (this.history && Array.isArray(this.history)) {
        this.history.forEach(historyEntry => {
            if (historyEntry.measuringLogs) {
                Object.values(historyEntry.measuringLogs).forEach(log => {
                    if (typeof log.value === 'number') {
                        log.value = parseFloat(log.value.toFixed(2));
                    }
                });
            }
        });
    }

    next();
});

// Method để lấy danh sách tất cả parameters có trong station
binhDuongSchema.methods.getAvailableParameters = function () {
    const params = new Set();

    // Từ currentData
    if (this.currentData?.measuringLogs) {
        Object.keys(this.currentData.measuringLogs).forEach(key => {
            params.add(key);
        });
    }

    // Từ history
    this.history?.forEach(entry => {
        if (entry.measuringLogs) {
            Object.keys(entry.measuringLogs).forEach(key => {
                params.add(key);
            });
        }
    });

    return Array.from(params);
};

// Method để lấy parameter metadata
binhDuongSchema.methods.getParameterInfo = function (paramKey) {
    // Tìm từ currentData trước
    if (this.currentData?.measuringLogs?.[paramKey]) {
        const param = this.currentData.measuringLogs[paramKey];
        return {
            key: param.key,
            name: param.name,
            unit: param.unit,
            maxLimit: param.maxLimit,
            minLimit: param.minLimit
        };
    }

    // Tìm từ history nếu không có trong currentData
    for (let entry of this.history) {
        if (entry.measuringLogs?.[paramKey]) {
            const param = entry.measuringLogs[paramKey];
            return {
                key: param.key,
                name: param.name,
                unit: param.unit,
                maxLimit: param.maxLimit,
                minLimit: param.minLimit
            };
        }
    }

    return null;
};

const BinhDuongModel = mongoose.model('BinhDuongStation', binhDuongSchema);
module.exports = BinhDuongModel;