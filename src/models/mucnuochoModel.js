const mongoose = require('mongoose');
// mực nước hồ tiếng anh là water level
const mucnuochoSchema = new mongoose.Schema({
  data_thoigian: {
    type: Date,
    required: true,
    unique: true,
  },
  data_thoigian_hienthi: {
    type: String,
    required: true,
  },
  mucnuocho: {
    type: Number,
    default: null,
  },
  unit: {
    type: String,
    enum: ['m'],
    default: 'm',
  },
}, {
  timestamps: true,
});

mucnuochoSchema.index({ data_thoigian: 1 });

mucnuochoSchema.methods.toChartData = function () {
  return {
    data_thoigian: this.data_thoigian.toISOString(),
    data_thoigian_hienthi: this.data_thoigian_hienthi,
    values: { mucnuocho: this.mucnuocho },
    unit: this.unit,
  };
};

const Mucnuocho = mongoose.model('Mucnuocho', mucnuochoSchema);

module.exports = Mucnuocho;