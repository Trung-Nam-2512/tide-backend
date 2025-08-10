// schema cho thủy triều thực tế

const mongoose = require('mongoose');

const tideRealySchema = new mongoose.Schema({
    // Mã trạm đo
    stationCode: {
        type: String,
        required: true,
        index: true
    },

    // Tên trạm (tùy chọn)
    stationName: {
        type: String,
        default: ''
    },

    // Thời gian đo (timestamp)
    timestamp: {
        type: Number,
        required: true,
        index: true
    },

    // Thời gian UTC
    utc: {
        type: Date,
        required: true,
        index: true
    },

    // Thời gian theo giờ Việt Nam (đã format)
    vietnamTime: {
        type: String,
        required: true
    },

    // Giá trị mực nước (cm)
    waterLevel: {
        type: Number,
        required: true
    },

    // Đơn vị đo
    unit: {
        type: String,
        default: 'cm'
    },

    // Loại dữ liệu (thực tế/dự báo)
    dataType: {
        type: String,
        enum: ['real', 'forecast'],
        default: 'real'
    },

    // Trạng thái dữ liệu
    status: {
        type: String,
        enum: ['active', 'inactive', 'deleted'],
        default: 'active'
    },

    // Thời gian tạo record
    createdAt: {
        type: Date,
        default: Date.now
    },

    // Thời gian cập nhật cuối
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true, // Tự động quản lý createdAt và updatedAt
    collection: 'tide_realy_data' // Tên collection trong MongoDB
});

// Indexes để tối ưu query
tideRealySchema.index({ stationCode: 1, timestamp: -1 });
tideRealySchema.index({ stationCode: 1, utc: -1 });
tideRealySchema.index({ timestamp: -1 });
tideRealySchema.index({ utc: -1 });

// Virtual field để lấy ngày (chỉ date, không có time)
tideRealySchema.virtual('date').get(function () {
    return this.utc.toISOString().split('T')[0];
});

// Method để format dữ liệu cho frontend
tideRealySchema.methods.toChartData = function () {
    return {
        timestamp: this.timestamp,
        utc: this.utc,
        vietnamTime: this.vietnamTime,
        waterLevel: this.waterLevel,
        unit: this.unit
    };
};

// Static method để lấy dữ liệu cho biểu đồ
tideRealySchema.statics.getChartData = async function (stationCode, startTime, endTime) {
    const query = {
        stationCode: stationCode,
        status: 'active',
        dataType: 'real'
    };

    if (startTime && endTime) {
        query.timestamp = {
            $gte: startTime,
            $lte: endTime
        };
    }

    return await this.find(query)
        .sort({ timestamp: 1 })
        .select('timestamp utc vietnamTime waterLevel unit')
        .lean();
};

// Static method để lấy dữ liệu mới nhất
tideRealySchema.statics.getLatestData = async function (stationCode, limit = 100) {
    return await this.find({
        stationCode: stationCode,
        status: 'active',
        dataType: 'real'
    })
        .sort({ timestamp: -1 })
        .limit(limit)
        .select('timestamp utc vietnamTime waterLevel unit')
        .lean();
};

// Static method để upsert dữ liệu (tránh duplicate)
tideRealySchema.statics.upsertData = async function (data) {
    const filter = {
        stationCode: data.stationCode,
        timestamp: data.timestamp
    };

    const update = {
        $set: {
            stationName: data.stationName || '',
            utc: data.utc,
            vietnamTime: data.vietnamTime,
            waterLevel: data.waterLevel,
            unit: data.unit || 'cm',
            dataType: data.dataType || 'real',
            status: data.status || 'active',
            updatedAt: new Date()
        }
    };

    const options = {
        upsert: true,
        new: true
    };

    return await this.findOneAndUpdate(filter, update, options);
};

const TideRealy = mongoose.model('TideRealy', tideRealySchema);

module.exports = TideRealy;