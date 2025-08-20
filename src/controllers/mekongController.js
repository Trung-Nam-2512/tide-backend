const {
    fetchAndSaveMekongData,
    fetchAndSaveAllMekongData,
    getMekongData,
    getRecentMekongData,
    getMekongStats
} = require('../services/mekongService');

/**
 * Fetch và lưu dữ liệu Mekong từ API cho một hoặc tất cả stations
 */
const fetchMekongData = async (req, res) => {
    const { stationCode, stationName } = req.query;

    try {
        console.log('🌊 Controller: Triggering Mekong data fetch...');

        let result;

        // Nếu có specify station code thì fetch cho station đó, ngược lại fetch tất cả
        if (stationCode) {
            const name = stationName || (stationCode === 'CDO' ? 'ChauDoc' : 'TanChau');
            console.log(`🎯 Fetching for specific station: ${name} (${stationCode})`);
            result = await fetchAndSaveMekongData(stationCode, name);
        } else {
            console.log('🌍 Fetching for all Mekong stations...');
            result = await fetchAndSaveAllMekongData();
        }

        if (result.success) {
            res.status(200).json({
                success: true,
                message: result.message,
                dataPoints: result.dataPoints || result.totalDataPoints,
                dateRange: result.dateRange,
                database: result.database,
                stationCode: result.stationCode,
                stationName: result.stationName,
                results: result.results, // For all stations fetch
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch Mekong data',
                message: result.message,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('❌ Controller error in fetchMekongData:', error.message);

        res.status(500).json({
            success: false,
            error: 'Server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Lấy dữ liệu Mekong từ database theo khoảng thời gian
 */
const getMekongDataController = async (req, res) => {
    const { from, to, limit = 1000 } = req.query;

    try {
        console.log('📊 Controller: Getting Mekong data from database...');

        // Parse date parameters
        let fromDate = null;
        let toDate = null;

        if (from) {
            fromDate = new Date(from);
            if (isNaN(fromDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid from date format',
                    message: 'Please use ISO date format (YYYY-MM-DD)',
                    example: '?from=2025-01-01&to=2025-01-31'
                });
            }
        }

        if (to) {
            toDate = new Date(to);
            if (isNaN(toDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid to date format',
                    message: 'Please use ISO date format (YYYY-MM-DD)',
                    example: '?from=2025-01-01&to=2025-01-31'
                });
            }
        }

        if (fromDate && toDate && fromDate > toDate) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date range',
                message: 'Start date must be before end date'
            });
        }

        console.log(`📅 Date range: ${from || 'all'} to ${to || 'all'}, limit: ${limit}`);

        const data = await getMekongData(fromDate, toDate, parseInt(limit));

        console.log(`✅ Found ${data.length} Mekong records`);

        res.status(200).json({
            success: true,
            data: data,
            dateRange: {
                from: from || null,
                to: to || null
            },
            count: data.length,
            limit: parseInt(limit),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Controller error in getMekongDataController:', error.message);

        res.status(500).json({
            success: false,
            error: 'Server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Lấy dữ liệu Mekong gần nhất
 */
const getRecentMekongDataController = async (req, res) => {
    const { days = 7 } = req.query;

    try {
        console.log(`📊 Controller: Getting recent Mekong data (last ${days} days)...`);

        const parsedDays = parseInt(days);
        if (isNaN(parsedDays) || parsedDays <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid days parameter',
                message: 'Days must be a positive number',
                example: '?days=7'
            });
        }

        const data = await getRecentMekongData(parsedDays);

        console.log(`✅ Found ${data.length} recent Mekong records`);

        res.status(200).json({
            success: true,
            data: data,
            days: parsedDays,
            count: data.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Controller error in getRecentMekongDataController:', error.message);

        res.status(500).json({
            success: false,
            error: 'Server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Lấy thống kê dữ liệu Mekong
 */
const getMekongStatsController = async (req, res) => {
    try {
        console.log('📊 Controller: Getting Mekong statistics...');

        const stats = await getMekongStats();

        console.log(`✅ Mekong statistics retrieved`);

        res.status(200).json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Controller error in getMekongStatsController:', error.message);

        res.status(500).json({
            success: false,
            error: 'Server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Health check cho Mekong service
 */
const mekongHealthCheck = async (req, res) => {
    try {
        console.log('🏥 Controller: Mekong health check requested');

        // Kiểm tra kết nối database bằng cách đếm documents
        const Mekong = require('../models/mekongModel');
        const totalRecords = await Mekong.countDocuments();

        // Lấy record mới nhất
        const latestRecord = await Mekong.findOne().sort({ date_gmt: -1 });

        res.status(200).json({
            success: true,
            status: 'healthy',
            service: 'mekong',
            database: {
                connected: true,
                totalRecords: totalRecords,
                latestRecord: latestRecord ? {
                    date: latestRecord.date_gmt,
                    val: latestRecord.val,
                    updatedAt: latestRecord.updatedAt
                } : null
            },
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });

    } catch (error) {
        console.error('❌ Controller error in mekongHealthCheck:', error.message);

        res.status(500).json({
            success: false,
            status: 'unhealthy',
            service: 'mekong',
            error: 'Server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Lấy dữ liệu Mekong theo màu sắc (lineColor)
 */
const getMekongDataByColor = async (req, res) => {
    const { color, limit = 1000 } = req.query;

    try {
        console.log(`📊 Controller: Getting Mekong data by color: ${color}`);

        if (!color) {
            return res.status(400).json({
                success: false,
                error: 'Missing color parameter',
                message: 'Color parameter is required',
                example: '?color=#0066FF'
            });
        }

        const Mekong = require('../models/mekongModel');
        const data = await Mekong.find({ lineColor: color })
            .sort({ date_gmt: 1 })
            .limit(parseInt(limit));

        console.log(`✅ Found ${data.length} Mekong records with color ${color}`);

        res.status(200).json({
            success: true,
            data: data,
            color: color,
            count: data.length,
            limit: parseInt(limit),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Controller error in getMekongDataByColor:', error.message);

        res.status(500).json({
            success: false,
            error: 'Server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Xóa toàn bộ dữ liệu Mekong (admin only)
 */
const clearMekongData = async (req, res) => {
    try {
        console.log('🗑️ Controller: Clearing all Mekong data...');

        const Mekong = require('../models/mekongModel');
        const result = await Mekong.deleteMany({});

        console.log(`✅ Cleared ${result.deletedCount} Mekong records`);

        res.status(200).json({
            success: true,
            message: 'All Mekong data cleared successfully',
            deletedCount: result.deletedCount,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Controller error in clearMekongData:', error.message);

        res.status(500).json({
            success: false,
            error: 'Server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = {
    fetchMekongData,
    getMekongDataController,
    getRecentMekongDataController,
    getMekongStatsController,   
    mekongHealthCheck,
    getMekongDataByColor,
    clearMekongData
};
