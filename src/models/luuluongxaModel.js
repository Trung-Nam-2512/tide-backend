const mongoose = require('mongoose');

const luuluongxaSchema = new mongoose.Schema({
    data_thoigian: {
        type: Date,
        required: true,
        unique: true,
    },
    data_thoigian_hienthi: {
        type: String,
        required: true,
    },
    luuluongxa: {
        type: Number,
        default: null,
    },
    luuluongcong: {
        type: Number,
        default: null,
    },
    luuluongtran: {
        type: Number,
        default: null,
    },
    luuluongthuydien: {
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

luuluongxaSchema.index({ data_thoigian: 1 });

luuluongxaSchema.methods.toChartData = function () {
    return {
        data_thoigian: this.data_thoigian.toISOString(),
        data_thoigian_hienthi: this.data_thoigian_hienthi,
        values: {
            luuluongxa: this.luuluongxa,
            luuluongcong: this.luuluongcong,
            luuluongtran: this.luuluongtran,
            luuluongthuydien: this.luuluongthuydien,
        },
        unit: this.unit,
    };
};

const Luuluongxa = mongoose.model('Luuluongxa', luuluongxaSchema);

module.exports = Luuluongxa;
