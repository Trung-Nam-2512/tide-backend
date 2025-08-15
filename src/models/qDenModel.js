const mongoose = require('mongoose');
// Q đến tiếng anh 
const qdenSchema = new mongoose.Schema({
    data_thoigian: {
        type: Date,
        required: true,
        unique: true,
    },
    data_thoigian_hienthi: {
        type: String,
        required: true,
    },
    qden: {
        type: Number,
        default: null,
    },
    unit: {
        type: String,
        enum: ['m³/s'],
        default: 'm³/s',
    },
}, {
    timestamps: true,
});

qdenSchema.index({ data_thoigian: 1 });

qdenSchema.methods.toChartData = function () {
    return {
        data_thoigian: this.data_thoigian.toISOString(),
        data_thoigian_hienthi: this.data_thoigian_hienthi,
        values: { qden: this.qden },
        unit: this.unit,
    };
};

const Qden = mongoose.model('Qden', qdenSchema);

module.exports = Qden;