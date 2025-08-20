const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const app = express();
const tideRoutes = require('./routes/tideRoutes');
const mongoose = require('mongoose');
const config = require('./config/config');
const cors = require('cors');
const { saveTriAnData } = require("../src/services/triAnService")
const connectDB = require('./dbs/mongo.init');
const { initScheduler } = require('./scheduler/tideDataScheduler');
const { initHoDauTiengScheduler } = require('./scheduler/hodautiengScheduler');
const { initMekongScheduler } = require('./scheduler/mekongScheduler');
const PORT = process.env.PORT || 5000;
const cron = require('node-cron');
const { initBinhDuongScheduler } = require('./scheduler/binhDuongScheduler');
const binhDuongService = require('./services/binhDuongService');

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://tide.nguyentrungnam.com',
        'https://www.tide.nguyentrungnam.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// API v1 routes
app.use('/api/v1', tideRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Hydrology Dashboard API',
        version: '1.0.0',
        // endpoints: {
        //     health: '/api/v1/health',
        //     fetchData: '/api/v1/fetch-tide-forecast-data',
        //     getData: '/api/v1/get-tide-forecast-data',
        //     getDataFromNow: '/api/v1/get-tide-data-from-now',
        //     getRecentData: '/api/v1/get-recent-tide-data',
        //     locations: '/api/v1/get-locations',
        //     combinedData: '/api/v1/get-combined-tide-data',
        //     forceFetchAll: '/api/v1/fetch-tide-realy-all'
        // },
        // features: {
        //     realTime: 'Dữ liệu thủy triều từ thời điểm hiện tại đến 1 tuần sau',
        //     recentData: 'Dữ liệu thủy triều gần nhất (real-time)',
        //     multipleLocations: 'Hỗ trợ nhiều địa điểm',
        //     scheduledData: 'Tự động gọi API thủy triều thực tế mỗi 3 giờ (0h, 3h, 6h, 9h, 12h, 15h, 18h, 21h)',
        //     hodautiengScheduler: 'Tự động gọi API Hồ Dầu Tiếng mỗi 1 tiếng (mực nước hồ, lưu lượng nước, lưu lượng xả)',
        //     mekongScheduler: 'Tự động gọi Mekong API mỗi 1 giờ để thu thập dữ liệu mực nước'
        // },
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// 
// Cron job: every 1 minute
cron.schedule('*/1 * * * *', async () => {
    await saveTriAnData();
    console.log('Tri An data scraped and saved');
});


// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
    });
});

const server = app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api/v1`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/v1/health`);
    console.log(`🌊 Real-time data: http://localhost:${PORT}/api/v1/get-tide-data-from-now`);
    console.log(`🔄 Combined data: http://localhost:${PORT}/api/v1/get-combined-tide-data`);

    // Khởi tạo Tide Data Scheduler sau khi server đã sẵn sàng
    console.log('⏰ Khởi tạo Tide Data Scheduler...');
    const { job: tideJob, stationUpdateJob } = initScheduler();

    // Khởi tạo HoDauTieng Data Scheduler
    console.log('🏞️ Khởi tạo HoDauTieng Data Scheduler...');
    const { hodautiengJob } = initHoDauTiengScheduler();

    // Khởi tạo Mekong Data Scheduler
    console.log('🌊 Khởi tạo Mekong Data Scheduler...');
    const { mekongJob } = initMekongScheduler();
    // Khởi tạo Binh Duong Data Scheduler
    console.log('🏙️ Khởi tạo Binh Duong Data Scheduler...');
    const { binhDuongJob } = initBinhDuongScheduler();

    // Log scheduler status
    console.log('✅ Tất cả Schedulers đã được khởi tạo (Tide, Station Update, HoDauTieng, Mekong, Binh Duong)');
    // Lưu job references để có thể dừng khi cần
    global.schedulerJobs = { tideJob, stationUpdateJob, hodautiengJob, mekongJob, binhDuongJob };
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');

    // Dừng scheduler nếu có
    if (global.schedulerJobs) {
        const { tideJob, stationUpdateJob, hodautiengJob, mekongJob } = global.schedulerJobs;
        if (tideJob) tideJob.stop();
        if (stationUpdateJob) stationUpdateJob.stop();
        if (hodautiengJob) hodautiengJob.stop();
        if (mekongJob) mekongJob.stop();
        console.log('⏹️ Tất cả Schedulers đã được dừng (Tide, Station Update, HoDauTieng, Mekong)');
    }

    server.close(() => {
        console.log('✅ Process terminated');
        process.exit(0);
    });
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');

    // Dừng scheduler nếu có
    if (global.schedulerJobs) {
        const { tideJob, stationUpdateJob, hodautiengJob, mekongJob } = global.schedulerJobs;
        if (tideJob) tideJob.stop();
        if (stationUpdateJob) stationUpdateJob.stop();
        if (hodautiengJob) hodautiengJob.stop();
        if (mekongJob) mekongJob.stop();
        console.log('⏹️ Tất cả Schedulers đã được dừng (Tide, Station Update, HoDauTieng, Mekong)');
    }

    server.close(() => {
        console.log('✅ Process terminated');
        process.exit(0);
    });
});









