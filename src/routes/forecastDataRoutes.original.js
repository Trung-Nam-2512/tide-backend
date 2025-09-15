/**
 * Forecast Data Routes - API endpoints cho dữ liệu dự báo mực nước Hồ Dầu Tiếng
 */

const express = require('express');
const router = express.Router();
const forecastHoDauTiengService = require('../services/forecastHoDauTiengService');
const { testForecastScheduler } = require('../scheduler/forecastHoDauTiengScheduler');

// =====================================
// ENDPOINT: FETCH FORECAST DATA
// =====================================

/**
 * @route   GET /api/forecast-data/fetch/:parameter?
 * @desc    Fetch dữ liệu dự báo cho parameter cụ thể hoặc tất cả
 * @access  Public
 * @param   parameter - MUCNUOCHO hoặc QDEN (optional)
 */
router.get('/fetch/:parameter?', async (req, res) => {
    try {
        const { parameter } = req.params;

        console.log(`🔄 Manual fetch request for parameter: ${parameter || 'ALL'}`);

        let result;

        if (parameter) {
            // Fetch cho parameter cụ thể
            if (!['MUCNUOCHO', 'QDEN'].includes(parameter.toUpperCase())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid parameter. Use MUCNUOCHO or QDEN',
                    timestamp: new Date().toISOString()
                });
            }

            result = await forecastHoDauTiengService.fetchAndStoreForecastData(parameter.toUpperCase());

        } else {
            // Fetch tất cả parameters
            result = await forecastHoDauTiengService.fetchAllForecastData();
        }

        if (result.success || (result.successful && result.successful > 0)) {
            res.status(200).json({
                success: true,
                message: parameter
                    ? `Forecast data fetched for ${parameter}`
                    : `Forecast data fetched for all parameters`,
                data: result,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.message || 'Failed to fetch forecast data',
                error: result.errors || [result.message],
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('❌ Forecast fetch error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// =====================================
// ENDPOINT: GET LATEST DATA
// =====================================

/**
 * @route   GET /api/forecast-data/latest/:parameter?
 * @desc    Lấy dữ liệu mới nhất
 * @access  Public
 * @param   parameter - MUCNUOCHO hoặc QDEN (optional, default MUCNUOCHO)
 * @query   dataSource - realtime hoặc forecast (optional)
 */
router.get('/latest/:parameter?', async (req, res) => {
    try {
        const parameter = (req.params.parameter || 'MUCNUOCHO').toUpperCase();
        const { dataSource } = req.query;

        if (!['MUCNUOCHO', 'QDEN'].includes(parameter)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid parameter. Use MUCNUOCHO or QDEN',
                timestamp: new Date().toISOString()
            });
        }

        const result = await forecastHoDauTiengService.getLatestData(parameter, dataSource);

        if (result.success) {
            res.status(200).json({
                success: true,
                message: result.data ? 'Latest data found' : 'No data found',
                data: result.data,
                parameter: parameter,
                dataSource: dataSource || 'all',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to get latest data',
                error: result.error,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('❌ Get latest data error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// =====================================
// ENDPOINT: GET DATA IN RANGE
// =====================================

/**
 * @route   GET /api/forecast-data/range/:parameter
 * @desc    Lấy dữ liệu trong khoảng thời gian
 * @access  Public
 * @param   parameter - MUCNUOCHO hoặc QDEN
 * @query   startDate - Ngày bắt đầu (ISO string)
 * @query   endDate - Ngày kết thúc (ISO string)
 * @query   dataSource - realtime hoặc forecast (optional)
 */
router.get('/range/:parameter', async (req, res) => {
    try {
        const parameter = req.params.parameter.toUpperCase();
        const { startDate, endDate, dataSource } = req.query;

        if (!['MUCNUOCHO', 'QDEN'].includes(parameter)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid parameter. Use MUCNUOCHO or QDEN',
                timestamp: new Date().toISOString()
            });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required',
                timestamp: new Date().toISOString()
            });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use ISO string format',
                timestamp: new Date().toISOString()
            });
        }

        if (start >= end) {
            return res.status(400).json({
                success: false,
                message: 'startDate must be before endDate',
                timestamp: new Date().toISOString()
            });
        }

        const result = await forecastHoDauTiengService.getDataInRange(
            parameter,
            startDate,
            endDate,
            dataSource
        );

        if (result.success) {
            res.status(200).json({
                success: true,
                message: `Found ${result.count} records`,
                data: result.data,
                count: result.count,
                parameter: parameter,
                dateRange: {
                    startDate,
                    endDate
                },
                dataSource: dataSource || 'all',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to get data in range',
                error: result.error,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('❌ Get data in range error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// =====================================
// ENDPOINT: GET STATISTICS
// =====================================

/**
 * @route   GET /api/forecast-data/statistics
 * @desc    Lấy thống kê dữ liệu dự báo
 * @access  Public
 */
router.get('/statistics', async (req, res) => {
    try {
        const result = await forecastHoDauTiengService.getDataStatistics();

        if (result.success) {
            // Process statistics để dễ hiểu hơn
            const processedStats = {};

            result.statistics.forEach(stat => {
                const key = `${stat._id.parameter_type}_${stat._id.data_source}`;
                processedStats[key] = {
                    parameter_type: stat._id.parameter_type,
                    data_source: stat._id.data_source,
                    total_records: stat.count,
                    latest_timestamp: stat.latest_timestamp,
                    earliest_timestamp: stat.earliest_timestamp,
                    data_span_hours: Math.round(
                        (new Date(stat.latest_timestamp) - new Date(stat.earliest_timestamp)) / (1000 * 60 * 60)
                    )
                };
            });

            res.status(200).json({
                success: true,
                message: 'Statistics retrieved successfully',
                data: {
                    statistics: processedStats,
                    raw_statistics: result.statistics,
                    summary: {
                        total_categories: result.statistics.length,
                        station_uuid: '613bbcf5-212e-43c5-9ef8-69016787454f'
                    }
                },
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to get statistics',
                error: result.error,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('❌ Get statistics error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// =====================================
// ENDPOINT: TEST SCHEDULER
// =====================================

/**
 * @route   GET /api/forecast-data/test-scheduler
 * @desc    Test scheduler manually
 * @access  Public
 */
router.get('/test-scheduler', async (req, res) => {
    try {
        console.log('🧪 Manual scheduler test triggered');

        const result = await testForecastScheduler();

        res.status(200).json({
            success: true,
            message: 'Scheduler test completed',
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Scheduler test error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Scheduler test failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// =====================================
// ENDPOINT: HEALTH CHECK
// =====================================

/**
 * @route   GET /api/forecast-data/health
 * @desc    Health check cho forecast data service
 * @access  Public
 */
router.get('/health', async (req, res) => {
    try {
        // Kiểm tra dữ liệu mới nhất
        const mucnuochoResult = await forecastHoDauTiengService.getLatestData('MUCNUOCHO');
        const qdenResult = await forecastHoDauTiengService.getLatestData('QDEN');

        // Kiểm tra thống kê
        const statsResult = await forecastHoDauTiengService.getDataStatistics();

        const health = {
            status: 'healthy',
            service: 'forecast-hodautieng',
            timestamp: new Date().toISOString(),
            data_availability: {
                mucnuocho: {
                    available: mucnuochoResult.success && mucnuochoResult.data,
                    latest_timestamp: mucnuochoResult.data?.timestamp || null
                },
                qden: {
                    available: qdenResult.success && qdenResult.data,
                    latest_timestamp: qdenResult.data?.timestamp || null
                }
            },
            statistics: {
                available: statsResult.success,
                total_categories: statsResult.statistics?.length || 0
            }
        };

        // Determine overall health status
        const hasRecentData = (mucnuochoResult.data || qdenResult.data);
        if (!hasRecentData) {
            health.status = 'warning';
            health.warning = 'No recent data available';
        }

        res.status(200).json({
            success: true,
            message: `Service is ${health.status}`,
            data: health
        });

    } catch (error) {
        console.error('❌ Health check error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// =====================================
// ROOT ENDPOINT
// =====================================

/**
 * @route   GET /api/forecast-data/
 * @desc    API information
 * @access  Public
 */
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Forecast Data API',
        description: 'API dự báo mực nước Hồ Dầu Tiếng với dữ liệu thực tế + dự báo 3 ngày',
        version: '1.0.0',
        endpoints: {
            'GET /fetch/:parameter?': 'Fetch dữ liệu dự báo (MUCNUOCHO/QDEN)',
            'GET /latest/:parameter?': 'Lấy dữ liệu mới nhất',
            'GET /range/:parameter': 'Lấy dữ liệu trong khoảng thời gian',
            'GET /statistics': 'Thống kê dữ liệu',
            'GET /test-scheduler': 'Test scheduler manually',
            'GET /health': 'Health check'
        },
        data_sources: {
            api_url: 'https://hodautieng.vn/jaxrs/QuanTracHoChua/getDataQuanTracMobile',
            station_uuid: '613bbcf5-212e-43c5-9ef8-69016787454f',
            parameters: ['MUCNUOCHO', 'QDEN'],
            schedule: 'Mỗi 1 giờ + Initial fetch khi start server'
        },
        timestamp: new Date().toISOString()
    });
});

// =====================================
// ERROR HANDLING
// =====================================

// 404 handler
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Forecast Data API endpoint not found',
        availableEndpoints: [
            'GET /api/forecast-data/',
            'GET /api/forecast-data/fetch/:parameter?',
            'GET /api/forecast-data/latest/:parameter?',
            'GET /api/forecast-data/range/:parameter',
            'GET /api/forecast-data/statistics',
            'GET /api/forecast-data/health'
        ],
        timestamp: new Date().toISOString()
    });
});

module.exports = router;