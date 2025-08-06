const express = require('express');
const app = express();
const tideRoutes = require('./routes/tideRoutes');
const mongoose = require('mongoose');
const config = require('./config/config');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./dbs/mongo.init');
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// API v1 routes
app.use('/api/v1', tideRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Hydrology Dashboard API',
        version: '1.0.0',
        endpoints: {
            health: '/api/v1/health',
            fetchData: '/api/v1/fetch-tide-forecast-data',
            getData: '/api/v1/get-tide-forecast-data',
            getDataFromNow: '/api/v1/get-tide-data-from-now',
            getRecentData: '/api/v1/get-recent-tide-data',
            locations: '/api/v1/get-locations'
        },
        features: {
            realTime: 'Dữ liệu thủy triều từ thời điểm hiện tại đến 1 tuần sau',
            recentData: 'Dữ liệu thủy triều gần nhất (real-time)',
            multipleLocations: 'Hỗ trợ nhiều địa điểm'
        },
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
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Process terminated');
        process.exit(0);
    });
});









