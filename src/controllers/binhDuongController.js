/**
 * CONTROLLER V2 - BACKWARD COMPATIBLE 
 * Controller mới sử dụng schema tối ưu nhưng API response giữ nguyên 100%
 * 
 * ✅ ZERO FRONTEND CHANGES REQUIRED
 * ✅ Same endpoints, same response format
 * ✅ Performance improvements under the hood
 */

const BinhDuongServiceV2 = require('../services/binhDuongServiceV2');
const binhDuongService = require('../services/binhDuongService');

// Khởi tạo service V2
const serviceV2 = new BinhDuongServiceV2();

/**
 * Lấy danh sách tất cả trạm quan trắc Bình Dương
 * 🔄 SAME API ENDPOINT: GET /get-station
 * 📊 SAME RESPONSE FORMAT
 * ⚡ OPTIMIZED PERFORMANCE with new schema
 */
const getStations = async (req, res, next) => {
    try {
        // Using V2 service with production data
        console.log('🔍 DEBUG: Using V2 Service for production data');

        // Sử dụng V2 service cho production data
        const stations = await serviceV2.getAllStations();

        // Response format GIỐNG HỆT cũ
        res.status(200).json({
            success: true,
            data: stations,
            count: stations.length
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Fetch dữ liệu từ API Bình Dương một cách thủ công
 * 🔄 SAME API ENDPOINT: POST /fetch-triggle-manual
 * 📊 SAME RESPONSE FORMAT
 * ⚡ DUAL-WRITE to both old and new schema during transition
 */
const fetchDataManually = async (req, res, next) => {
    try {
        // Service V2 với dual-write capability
        const result = await serviceV2.fetchAndSaveData();

        // Response format GIỐNG HỆT cũ
        res.status(200).json({
            success: true,
            message: 'Dữ liệu Bình Dương đã được fetch và lưu thành công',
            timestamp: new Date().toISOString(),
            // Optional: Add V2 metadata for monitoring
            v2Result: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Lấy lịch sử dữ liệu của một trạm theo khoảng thời gian
 * 🔄 SAME API ENDPOINT: POST /get-binhduong-history
 * 📊 SAME RESPONSE FORMAT 
 * ⚡ BUCKET-BASED QUERIES for better performance
 */
const getStationHistory = async (req, res, next) => {
    try {
        // Using V2 service with production data
        console.log('🔍 DEBUG: Using V2 Service for history data');

        const { key } = req.query;
        const { start, end } = req.body;

        // Validation - GIỐNG HỆT cũ
        if (!key) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_STATION_KEY',
                message: 'Tham số key (mã trạm) là bắt buộc'
            });
        }

        if (!start || !end) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_DATE_RANGE',
                message: 'Cả start và end dates đều là bắt buộc'
            });
        }

        const startDate = new Date(start);
        const endDate = new Date(end);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_DATE_FORMAT',
                message: 'Format ngày tháng không hợp lệ. Sử dụng ISO string.'
            });
        }

        if (startDate >= endDate) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_DATE_RANGE',
                message: 'Start date phải nhỏ hơn end date'
            });
        }

        // Service V2 với bucket-based queries
        const history = await serviceV2.getStationHistory(key, startDate, endDate);

        // Response format GIỐNG HỆT cũ
        res.status(200).json({
            success: true,
            data: history.history || [],
            metadata: {
                station: key,
                timeRange: {
                    start: startDate,
                    end: endDate
                },
                recordCount: history.history?.length || 0
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử dữ liệu:', {
            key: req.query.key,
            error: error.message
        });
        next(error);
    }
};

/**
 * Lấy metadata của tất cả parameters
 * 🔄 SAME API ENDPOINT: GET /get-binhduong-parameters
 * 📊 ENHANCED with V2 metadata from station_metadata_v2
 */
const getParametersMetadata = async (req, res, next) => {
    try {
        // Service V2 có thể lấy metadata từ station_metadata_v2
        const metadata = await serviceV2.getParametersMetadata();

        res.status(200).json({
            success: true,
            data: metadata,
            count: Object.keys(metadata).length,
            message: 'Lấy metadata parameters thành công'
        });
    } catch (error) {
        console.error('Lỗi khi lấy metadata parameters:', error.message);
        next(error);
    }
};

/**
 * Migration dữ liệu từ old schema sang new schema
 * 🆕 ENHANCED migration với dual-schema support
 */
const migrateToNewSchema = async (req, res, next) => {
    try {
        console.log('🚀 Bắt đầu migration từ old schema sang new schema...');

        // Migration logic sẽ:
        // 1. Backup old data
        // 2. Migrate to bucket format
        // 3. Validate data integrity
        // 4. Switch to new schema

        const result = await serviceV2.migrateFromOldSchema();

        res.status(200).json({
            success: true,
            message: 'Migration sang schema mới hoàn thành',
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Lỗi migration:', error.message);
        next(error);
    }
};

// Export với SAME function names để không cần sửa routes
module.exports = {
    getStations,            // ✅ SAME API
    fetchDataManually,      // ✅ SAME API  
    getStationHistory,      // ✅ SAME API
    getParametersMetadata,  // ✅ SAME API
    migrateHistoryData: migrateToNewSchema  // 🆕 Enhanced migration
};
