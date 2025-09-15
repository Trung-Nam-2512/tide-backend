/**
 * Hydrology Dashboard API Server
 * 
 * Máy chủ API cho hệ thống dashboard thủy văn, quản lý:
 * - Dữ liệu thủy triều từ nhiều nguồn
 * - Dữ liệu mực nước hồ và sông
 * - Dữ liệu quan trắc môi trường các tỉnh
 * - Schedulers tự động thu thập dữ liệu định kỳ
 * 
 * @version 1.0.0
 * @author Hydrology Team
 */

// Core dependencies
const express = require('express');           // Web framework
const dotenv = require('dotenv');             // Environment variables
const mongoose = require('mongoose');         // MongoDB ODM
const cors = require('cors');                 // Cross-Origin Resource Sharing
const cron = require('node-cron');            // Cron jobs

// Load environment variables
dotenv.config();

// Application configuration
const config = require('./config/config');
const PORT = process.env.PORT || 5000;

// Initialize Express app
const app = express();

// Routes
const tideRoutes = require('./routes/tideRoutes');
const forecastRoutes = require('./routes/forecastRoutes');
const forecastDataRoutes = require('./routes/forecastDataRoutes');
const swmmRoutes = require('./routes/swmmRoutes');
const rainfallRoutes = require('./routes/rainfallRoutes');

// Database connection
const connectDB = require('./dbs/mongo.init');

// Services
const { saveTriAnData } = require("../src/services/triAnService");
const binhDuongService = require('./services/binhDuongService');

// Schedulers
const { initScheduler } = require('./scheduler/tideDataScheduler');
const { initHoDauTiengScheduler } = require('./scheduler/hodautiengScheduler');
const { initMekongScheduler } = require('./scheduler/mekongScheduler');
const { initBinhDuongScheduler } = require('./scheduler/binhDuongScheduler');
const { initForecastHoDauTiengScheduler } = require('./scheduler/forecastHoDauTiengScheduler');

// Khởi tạo kết nối database
connectDB();

// ===== MIDDLEWARE CONFIGURATION =====

// CORS - Cho phép các domain được chỉ định truy cập API
app.use(cors({
    origin: [
        'http://localhost:3000',                    // Local development
        'http://localhost:3001',                    // Local alternative port
        'https://tide.nguyentrungnam.com',          // Production domain
        'https://www.tide.nguyentrungnam.com'       // Production www domain
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true                               // Cho phép gửi cookies
}));

// Body parsing middleware
app.use(express.json());                            // Parse JSON requests
app.use(express.urlencoded({ extended: true }));    // Parse URL-encoded requests
// ===== ROUTES CONFIGURATION =====

// API v1 routes - Tất cả endpoints sẽ có prefix /api/v1
app.use('/api/v1', tideRoutes);

// Forecast API routes - Endpoint dự báo mực nước
app.use('/api/forecast', forecastRoutes);

// Forecast Data API routes - Endpoint dữ liệu dự báo Hồ Dầu Tiếng
app.use('/api/forecast-data', forecastDataRoutes);

// SWMM integration routes (mô phỏng thủy văn)
app.use('/api/swmm', swmmRoutes);

// Rainfall forecast routes (dữ liệu mưa cho SWMM)
app.use('/api/rainfall-forecast', rainfallRoutes);

// ===== API ENDPOINTS =====

/**
 * Root endpoint - API information
 * @route GET /
 * @description Trả về thông tin cơ bản về API và các tính năng
 */
app.get('/', (req, res) => {
    res.json({
        message: 'Hydrology Dashboard API',
        version: '1.0.0',
        description: 'API hệ thống dashboard thủy văn - Thu thập và cung cấp dữ liệu thủy triều, mực nước, môi trường',
        status: 'running',
        // Commented out để giảm response size - có thể uncomment khi cần debug
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
        timestamp: new Date().toISOString(),
        forecastAPI: {
            description: 'API dự báo mực nước tích hợp từ Hồ Dầu Tiếng',
            baseUrl: '/api/forecast',
            endpoints: [
                'GET /api/forecast/stations - Danh sách trạm dự báo',
                'POST /api/forecast/fetch-data - Lấy dữ liệu từ API nguồn',
                'POST /api/forecast/sync-all - Đồng bộ tất cả trạm',
                'POST /api/forecast/query - Query dữ liệu lịch sử',
                'GET /api/forecast/health - Health check'
            ]
        },
        forecastDataAPI: {
            description: 'API dữ liệu dự báo Hồ Dầu Tiếng với tự động scheduler',
            baseUrl: '/api/forecast-data',
            endpoints: [
                'GET /api/forecast-data/ - API information',
                'GET /api/forecast-data/fetch/:parameter? - Fetch dữ liệu dự báo (MUCNUOCHO/QDEN)',
                'GET /api/forecast-data/latest/:parameter? - Lấy dữ liệu mới nhất',
                'GET /api/forecast-data/range/:parameter - Lấy dữ liệu trong khoảng thời gian',
                'GET /api/forecast-data/statistics - Thống kê dữ liệu',
                'GET /api/forecast-data/test-scheduler - Test scheduler manually',
                'GET /api/forecast-data/health - Health check'
            ],
            schedule: 'Tự động chạy mỗi 1 giờ + Initial fetch khi start server'
        }
    });
});

// ===== ERROR HANDLING =====

/**
 * Global error handling middleware
 * @description Xử lý tất cả lỗi không được catch trong application
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware function
 */
app.use((err, req, res, next) => {
    // Log chi tiết lỗi để debug
    console.error('❌ Server error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    
    // Trả về response lỗi chuẩn
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Đã xảy ra lỗi server',
        timestamp: new Date().toISOString()
    });
});

// ===== CRON JOBS =====

/**
 * Cron job cho dữ liệu Trị An
 * @schedule Mỗi 1 phút
 * @description Thu thập dữ liệu từ trang web Trị An và lưu vào database
 */
cron.schedule('*/1 * * * *', async () => {
    try {
        console.log('🔄 Bắt đầu thu thập dữ liệu Trị An...');
        await saveTriAnData();
        console.log('✅ Dữ liệu Trị An đã được thu thập và lưu thành công');
    } catch (error) {
        console.error('❌ Lỗi khi thu thập dữ liệu Trị An:', error.message);
    }
});


/**
 * 404 Not Found handler
 * @description Xử lý tất cả requests đến routes không tồn tại
 */
app.use('*', (req, res) => {
    console.warn(`⚠️ 404 - Route không tồn tại: ${req.method} ${req.originalUrl}`);
    
    res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Route ${req.originalUrl} không tồn tại`,
        method: req.method,
        availableRoutes: ['/api/v1/health', '/api/v1/stations', '/api/v1/tide-data'],
        timestamp: new Date().toISOString()
    });
});

// ===== SERVER STARTUP =====

/**
 * Khởi động server và các schedulers
 * @description 
 * - Khởi động Express server
 * - Khởi tạo tất cả schedulers cho việc thu thập dữ liệu tự động
 * - Log thông tin server và các endpoints
 */
const server = app.listen(PORT, () => {
    console.log('\n🚀 ===== HYDROLOGY DASHBOARD API STARTED ===== 🚀');
    console.log(`📍 Server đang chạy trên port: ${PORT}`);
    console.log(`📡 API base URL: http://localhost:${PORT}/api/v1`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/v1/health`);
    console.log(`🌊 Real-time data: http://localhost:${PORT}/api/v1/get-tide-data-from-now`);
    console.log(`🔄 Combined data: http://localhost:${PORT}/api/v1/get-combined-tide-data`);
    console.log('\n⏰ ===== KHỞI TẠO SCHEDULERS ===== ⏰');

    // Khởi tạo các schedulers theo thứ tự ưu tiên
    
    // 1. Tide Data Scheduler - Thu thập dữ liệu thủy triều
    console.log('🌊 Khởi tạo Tide Data Scheduler...');
    const { job: tideJob, stationUpdateJob } = initScheduler();

    // 2. HoDauTieng Data Scheduler - Thu thập dữ liệu hồ Dầu Tiếng
    console.log('🏞️ Khởi tạo HoDauTieng Data Scheduler...');
    const { hodautiengJob } = initHoDauTiengScheduler();

    // 3. Mekong Data Scheduler - Thu thập dữ liệu sông Mekong
    console.log('🌊 Khởi tạo Mekong Data Scheduler...');
    const { mekongJob } = initMekongScheduler();
    
    // 4. Binh Duong Data Scheduler - Thu thập dữ liệu môi trường Bình Dương
    console.log('🏙️ Khởi tạo Binh Duong Data Scheduler...');
    const { binhDuongJob } = initBinhDuongScheduler();

    // 5. Forecast Hồ Dầu Tiếng Scheduler - Thu thập dữ liệu dự báo mực nước
    console.log('📊 Khởi tạo Forecast Hồ Dầu Tiếng Scheduler...');
    const { forecastHoDauTiengJob } = initForecastHoDauTiengScheduler();

    // Lưu references của tất cả jobs để quản lý lifecycle
    global.schedulerJobs = { 
        tideJob, 
        stationUpdateJob, 
        hodautiengJob, 
        mekongJob, 
        binhDuongJob,
        forecastHoDauTiengJob 
    };
    
    console.log('✅ Tất cả Schedulers đã được khởi tạo thành công!');
    console.log('📊 Schedulers hoạt động:');
    console.log('   - Tide Data: Mỗi 3 giờ');
    console.log('   - Station Update: Theo định kỳ');
    console.log('   - HoDauTieng: Mỗi 1 giờ');
    console.log('   - Mekong: Mỗi 1 giờ');
    console.log('   - Binh Duong: Theo cấu hình');
    console.log('   - Tri An: Mỗi 1 phút (cron job)');
    console.log('   - Forecast Hồ Dầu Tiếng: Mỗi 1 giờ (MUCNUOCHO + QDEN với dự báo 3 ngày)');
    console.log('\n🎯 ===== SERVER READY ===== 🎯\n');
});

// ===== GRACEFUL SHUTDOWN HANDLERS =====

/**
 * Xử lý SIGTERM signal - Graceful shutdown
 * @description 
 * - Dừng tất cả schedulers
 * - Đóng server connections
 * - Cleanup resources
 */
process.on('SIGTERM', () => {
    console.log('\n🛑 SIGTERM received - Bắt đầu graceful shutdown...');

    // Dừng tất cả schedulers để tránh job chạy khi đang shutdown
    if (global.schedulerJobs) {
        const { tideJob, stationUpdateJob, hodautiengJob, mekongJob, binhDuongJob } = global.schedulerJobs;
        
        console.log('⏹️ Đang dừng schedulers...');
        if (tideJob) {
            tideJob.stop();
            console.log('   ✓ Tide scheduler stopped');
        }
        if (stationUpdateJob) {
            stationUpdateJob.stop();
            console.log('   ✓ Station update scheduler stopped');
        }
        if (hodautiengJob) {
            hodautiengJob.stop();
            console.log('   ✓ HoDauTieng scheduler stopped');
        }
        if (mekongJob) {
            mekongJob.stop();
            console.log('   ✓ Mekong scheduler stopped');
        }
        if (binhDuongJob) {
            binhDuongJob.stop();
            console.log('   ✓ Binh Duong scheduler stopped');
        }
        
        console.log('✅ Tất cả Schedulers đã được dừng');
    }

    // Đóng server và exit process
    server.close(() => {
        console.log('✅ Server đã được shutdown gracefully');
        process.exit(0);
    });
});

/**
 * Xử lý SIGINT signal (Ctrl+C) - Manual shutdown
 * @description Tương tự SIGTERM nhưng cho việc dừng thủ công (Ctrl+C)
 */
process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT received (Ctrl+C) - Bắt đầu shutdown...');

    // Dừng tất cả schedulers
    if (global.schedulerJobs) {
        const { tideJob, stationUpdateJob, hodautiengJob, mekongJob, binhDuongJob } = global.schedulerJobs;
        
        console.log('⏹️ Đang dừng schedulers...');
        if (tideJob) {
            tideJob.stop();
            console.log('   ✓ Tide scheduler stopped');
        }
        if (stationUpdateJob) {
            stationUpdateJob.stop();
            console.log('   ✓ Station update scheduler stopped');
        }
        if (hodautiengJob) {
            hodautiengJob.stop();
            console.log('   ✓ HoDauTieng scheduler stopped');
        }
        if (mekongJob) {
            mekongJob.stop();
            console.log('   ✓ Mekong scheduler stopped');
        }
        if (binhDuongJob) {
            binhDuongJob.stop();
            console.log('   ✓ Binh Duong scheduler stopped');
        }
        
        console.log('✅ Tất cả Schedulers đã được dừng');
    }

    // Đóng server và exit
    server.close(() => {
        console.log('✅ Process terminated');
        process.exit(0);
    });
});

/**
 * Xử lý uncaught exceptions
 * @description Catch các lỗi không được handle để tránh crash
 */
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
    });
    
    // Log và tiếp tục chạy (hoặc restart nếu cần)
    // Trong production, có thể cần restart process
});

/**
 * Xử lý unhandled promise rejections
 * @description Catch các promise rejections không được handle
 */
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', {
        reason: reason,
        promise: promise,
        timestamp: new Date().toISOString()
    });
    
    // Log warning nhưng không crash process
});









