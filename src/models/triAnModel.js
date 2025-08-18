const mongoose = require('mongoose');

const triAnSchema = new mongoose.Schema({
    time: { type: Date, required: true, unique: true, index: true },
    htl: { type: Number, required: true },
    hdbt: { type: Number, required: true },
    hc: { type: Number, required: true },
    qve: { type: Number, required: true },
    sumQx: { type: Number, required: true },
    qxt: { type: Number, required: true },
    qxm: { type: Number, required: true },
    ncxs: { type: Number, required: true },
    ncxm: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('TriAnData', triAnSchema);