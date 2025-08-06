const mongoose = require('mongoose');


const tideSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    tide: {
        type: Number,
        required: true
    },
    location: {
        type: String,
        required: true
    }
}, { timestamps: true });

// Tạo compound index để đảm bảo unique cho date + location
tideSchema.index({ date: 1, location: 1 }, { unique: true });

const Tide = mongoose.model('Tide', tideSchema);

module.exports = Tide;