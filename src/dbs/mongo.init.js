const mongoose = require('mongoose');
const config = require('../config/config');


const connectDB = async () => {
    try {
        await mongoose.connect(config.mongo.url);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}
module.exports = connectDB;
