const Tide = require('../models/tideModel');
const { fetchTideData, getTideDataFromNow, getTideDataByDateRange, getRecentTideData } = require('../services/tideService');
const { getTideRealy, getTideRealyFromDB } = require('../services/tideRealyService');

const triggerFetchTideData = async (req, res) => {
    const { location } = req.query;
    const defaultLocation = 'VUNGTAU';
    console.log(location);
    const finalLocation = location || defaultLocation;

    try {
        console.log(`🌊 Controller: Fetching tide data for location: ${finalLocation}`);

        const result = await fetchTideData(finalLocation);

        res.status(200).json({
            success: true,
            message: result.message,
            location: finalLocation,
            dataPoints: result.dataPoints,
            dateRange: result.dateRange,
            tideRange: result.tideRange,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Controller error:', error.message);

        res.status(500).json({
            success: false,
            error: 'Server error',
            message: error.message,
            location: finalLocation,
            timestamp: new Date().toISOString()
        });
    }
}

const getTideData = async (req, res) => {
    const { from, to, location } = req.query;
    const defaultLocation = 'VUNGTAU';
    const finalLocation = location || defaultLocation;

    try {
        // Validate required parameters
        if (!from || !to) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters',
                message: 'Both "from" and "to" date parameters are required',
                example: '?from=2025-01-01&to=2025-01-31&location=VUNGTAU'
            });
        }

        // Validate date format
        const fromDate = new Date(from);
        const toDate = new Date(to);

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format',
                message: 'Please use ISO date format (YYYY-MM-DD)',
                example: '?from=2025-01-01&to=2025-01-31'
            });
        }

        if (fromDate > toDate) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date range',
                message: 'Start date must be before end date'
            });
        }

        console.log(`📊 Controller: Fetching tide data from DB for location: ${finalLocation}`);
        console.log(`📅 Date range: ${from} to ${to}`);

        const data = await getTideDataByDateRange(finalLocation, fromDate, toDate);

        console.log(`✅ Found ${data.length} tide data records`);

        res.status(200).json({
            success: true,
            data: data,
            location: finalLocation,
            dateRange: {
                from: from,
                to: to
            },
            count: data.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Controller error in getTideData:', error.message);

        res.status(500).json({
            success: false,
            error: 'Server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Lấy dữ liệu thủy triều từ thời điểm hiện tại đến 1 tuần sau
 */
const getTideDataFromNowController = async (req, res) => {
    const { location } = req.query;
    const defaultLocation = 'VUNGTAU';
    const finalLocation = location || defaultLocation;

    try {
        console.log(`📊 Controller: Fetching tide data from now for location: ${finalLocation}`);

        // Tính toán thời gian bắt đầu (làm tròn lên đến giờ tiếp theo)
        const now = new Date();
        const startTime = new Date(now);
        startTime.setMinutes(0, 0, 0); // Đặt phút và giây về 0
        startTime.setHours(startTime.getHours() + 1); // Làm tròn lên đến giờ tiếp theo

        // Tính toán thời gian kết thúc (7 ngày sau)
        const endTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000);

        console.log(`📅 Time range: ${startTime.toISOString()} to ${endTime.toISOString()}`);

        const data = await getTideDataFromNow(finalLocation, startTime, endTime);

        console.log(`✅ Found ${data.length} tide data records for next week`);

        res.status(200).json({
            success: true,
            data: data,
            location: finalLocation,
            dateRange: {
                from: startTime.toISOString(),
                to: endTime.toISOString(),
                currentTime: now.toISOString(),
                roundedStartTime: startTime.toISOString()
            },
            count: data.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Controller error in getTideDataFromNow:', error.message);

        res.status(500).json({
            success: false,
            error: 'Server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Lấy dữ liệu thủy triều gần nhất (real-time)
 */
const getRecentTideDataController = async (req, res) => {
    const { location, hours = 24 } = req.query;
    const defaultLocation = 'VUNGTAU';
    const finalLocation = location || defaultLocation;

    try {
        console.log(`📊 Controller: Fetching recent tide data for location: ${finalLocation} (last ${hours} hours)`);

        const data = await getRecentTideData(finalLocation, parseInt(hours));

        console.log(`✅ Found ${data.length} recent tide data records`);

        res.status(200).json({
            success: true,
            data: data,
            location: finalLocation,
            hours: parseInt(hours),
            count: data.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Controller error in getRecentTideData:', error.message);

        res.status(500).json({
            success: false,
            error: 'Server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Lấy danh sách các địa điểm có sẵn
 */
const getLocations = async (req, res) => {
    try {
        console.log('📍 Controller: Getting available locations');

        // Lấy danh sách các location có dữ liệu trong database
        const locations = await Tide.distinct('location');
        console.log(locations);
        // Tạo danh sách địa điểm với thông tin chi tiết
        const locationDetails = locations.map(location => ({
            code: location,
            name: getLocationName(location),
            coordinates: getLocationCoordinates(location),
            description: `Trạm đo thủy triều ${getLocationName(location)}`
        }));

        console.log(`✅ Found ${locations.length} locations`);

        res.status(200).json({
            success: true,
            data: locationDetails,
            count: locations.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Controller error in getLocations:', error.message);

        res.status(500).json({
            success: false,
            error: 'Server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Health check endpoint
 */
const healthCheck = async (req, res) => {
    try {
        console.log('🏥 Controller: Health check requested');

        // Kiểm tra kết nối database bằng cách đếm documents
        const totalRecords = await Tide.countDocuments();

        res.status(200).json({
            success: true,
            status: 'healthy',
            database: {
                connected: true,
                totalRecords: totalRecords
            },
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });

    } catch (error) {
        console.error('❌ Controller error in healthCheck:', error.message);

        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: 'Server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Helper function để lấy tên địa điểm
 */
const getLocationName = (code) => {
    const locationNames = {
        'VUNGTAU': 'Vũng Tàu',
        'NHABE': 'Nhà Bè',
        'PHUAN': 'Phú An',
        'BIENHOA': 'Biên Hòa',
        'THUDAUMOT': 'Thủ Dầu Một'
    };
    return locationNames[code] || code;
};

/**
 * Helper function để lấy tọa độ địa điểm
 */
const getLocationCoordinates = (code) => {
    const coordinates = {
        'VUNGTAU': [10.3459, 107.0843],
        'NHABE': [10.640954, 106.7374760],
        'PHUAN': [10.780554, 106.711439],
        'BIENHOA': [10.933065, 106.818923],
        'THUDAUMOT': [10.980568, 106.649706],
        // "HODAUTIENG"
        'VAMKENH': [10.269888, 106.740194],
        'BENLUC': [10.634111, 106.478556],
        'BINHDAI': [10.197028, 106.711222],
        'HOABINH': [10.286139, 106.59125],
        'TRAVINH': [9.976722, 106.353306],
        'ANTHUAN': [9.975833, 106.605222],
        'BENTRAI': [9.880889, 106.529],
        'DAINGAI': [9.734556, 106.07425],
        'TRANDE': [9.500278, 106.201389],
        'GANHHAO': [9.031444, 105.4195],
        'RACHGIA': [10.012306, 105.084083],
        'XEORO': [9.86475, 105.110861],
        'CAMAU': [9.172472, 105.148694],
        'SONGDOC': [9.041194, 104.833167],
        'NAMCAN': [8.764944, 105.066667],
        'CAUDA': [12.2, 109.216667],
        'CANTHO': [10.033333, 105.783333],
        'CHOLACH': [10.275111, 106.126722],
        'DK17': [8.033333, 110.616667],
        'HATIEN': [10.433333, 104.5],
    };
    return coordinates[code] || [0, 0];
};

/**
 * Lấy cả dữ liệu dự báo và thực đo thủy triều
 */
const getCombinedTideData = async (req, res) => {
    const { location } = req.query;
    const defaultLocation = 'VUNGTAU';
    const finalLocation = location || defaultLocation;

    try {
        console.log(`📊 Controller: Fetching combined tide data for location: ${finalLocation}`);

        // Lấy dữ liệu dự báo từ 2 ngày trước hiện tại đến 5 ngày sau
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 ngày trước
        const fiveDaysLater = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 ngày sau
        const forecastData = await getTideDataFromNow(finalLocation, twoDaysAgo, fiveDaysLater);

        // Lấy stationCode từ dữ liệu dự báo
        let stationCode = null;
        if (forecastData && forecastData.length > 0) {
            stationCode = forecastData[0].stationCode;
        }

        let realData = [];
        if (stationCode) {
            try {
                // Lấy dữ liệu thực đo trong database
                realData = await getTideRealyFromDB(stationCode);
            } catch (error) {
                console.warn('⚠️ Could not fetch real data:', error.message);
            }
        }

        // Chuyển đổi dữ liệu thực đo sang format tương thích
        const formattedRealData = realData.map(item => ({
            date: new Date(item.Timestamp),
            tide: item.GiaTri, // Dữ liệu đã được chuyển đổi sang cm từ backend
            location: finalLocation,
            stationCode: stationCode,
            type: 'real',
            utc: item.UTC,
            vietnamTime: item.GioVietNam
        }));

        // Chuyển đổi dữ liệu dự báo sang format tương thích
        const formattedForecastData = forecastData.map(item => ({
            date: new Date(item.date),
            tide: item.tide,
            location: finalLocation,
            stationCode: stationCode,
            type: 'forecast'
        }));

        console.log(`✅ Found ${formattedForecastData.length} forecast records and ${formattedRealData.length} real records`);

        res.status(200).json({
            success: true,
            data: {
                forecast: formattedForecastData,
                real: formattedRealData,
                combined: [...formattedForecastData, ...formattedRealData].sort((a, b) => a.date - b.date)
            },
            location: finalLocation,
            stationCode: stationCode,
            counts: {
                forecast: formattedForecastData.length,
                real: formattedRealData.length,
                total: formattedForecastData.length + formattedRealData.length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Controller error in getCombinedTideData:', error.message);

        res.status(500).json({
            success: false,
            error: 'Server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = {
    getTideData,
    triggerFetchTideData,
    getTideDataFromNow: getTideDataFromNowController,
    getRecentTideData: getRecentTideDataController,
    getLocations,
    healthCheck,
    getCombinedTideData
}; 