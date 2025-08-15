// xử lý các api liên quan đến thủy triều thực tế
const axios = require('axios');
const config = require('../config/config');
const Tide = require('../models/tideModel');
const TideRealy = require('../models/tideRealyModel');
const { parseDateString, parseRawData, convertApiData, removeDuplicateData } = require('../utils/helpers');
const DatabaseUtils = require('../utils/databaseUtils');
const DataProcessingUtils = require('../utils/dataProcessingUtils');
const API_URL_TiDE_REALY = process.env.API_URL_TiDE_REALY;

// Cache để lưu thời gian gọi API cuối cùng cho mỗi trạm
const apiCallCache = new Map();
// Cache để lưu số lần lỗi liên tiếp
const errorCountCache = new Map();

// Hàm lấy thời gian hiện tại theo GMT+7
const getCurrentVietnamTime = () => {
    const now = new Date();
    const vietnamTime = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // GMT+7
    return vietnamTime;
};

// Hàm kiểm tra xem có phải giờ gọi API không (mỗi 3 giờ)
const isScheduledAPITime = () => {
    const now = getCurrentVietnamTime();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Chỉ gọi API vào các giờ chia hết cho 3 (với độ lệch ±5 phút)
    const isScheduledHour = hour % 3 === 0;
    const isWithinTimeWindow = minute >= 0 && minute <= 5; // Cho phép độ lệch 5 phút

    return isScheduledHour && isWithinTimeWindow;
};

// Hàm kiểm tra xem có cần gọi API không (cải thiện)
const shouldCallAPI = async (stationCode) => {
    const now = getCurrentVietnamTime();
    const lastCallTime = apiCallCache.get(stationCode);
    const errorCount = errorCountCache.get(stationCode) || 0;

    // Nếu có quá nhiều lỗi liên tiếp (>3), tăng thời gian chờ
    if (errorCount > 3) {
        console.log(`⚠️ Trạm ${stationCode} có ${errorCount} lỗi liên tiếp, tăng thời gian chờ`);
        if (lastCallTime) {
            const timeDiff = now.getTime() - lastCallTime.getTime();
            const extendedWaitTime = 12 * 60 * 60 * 1000; // 12 giờ
            if (timeDiff < extendedWaitTime) {
                console.log(`📊 Chờ thêm ${Math.round((extendedWaitTime - timeDiff) / (60 * 1000))} phút do lỗi liên tiếp`);
                return false;
            }
        }
    }

    // Nếu chưa có cache, cần gọi API
    if (!lastCallTime) {
        console.log(`📊 Chưa có cache cho trạm ${stationCode}, cần gọi API`);
        return true;
    }

    // Kiểm tra xem có phải giờ gọi API không
    if (isScheduledAPITime()) {
        const timeDiff = now.getTime() - lastCallTime.getTime();
        const minIntervalMs = 6 * 60 * 60 * 1000; // Tối thiểu 6 giờ giữa các lần gọi

        if (timeDiff >= minIntervalMs) {
            console.log(`📊 Đã đến giờ gọi API (${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}), cần gọi API`);
            return true;
        } else {
            console.log(`📊 Chưa đủ thời gian giữa các lần gọi (${Math.round(timeDiff / (60 * 1000))} phút)`);
            return false;
        }
    }

    // Nếu không phải giờ gọi API, sử dụng cache
    console.log(`📊 Không phải giờ gọi API, sử dụng cache`);
    return false;
};

// Hàm cập nhật thời gian gọi API
const updateAPICallTime = (stationCode) => {
    apiCallCache.set(stationCode, getCurrentVietnamTime());
    // Reset error count khi thành công
    errorCountCache.set(stationCode, 0);
};

// Hàm cập nhật số lần lỗi
const updateErrorCount = (stationCode) => {
    const currentCount = errorCountCache.get(stationCode) || 0;
    errorCountCache.set(stationCode, currentCount + 1);
    console.log(`❌ Tăng error count cho trạm ${stationCode}: ${currentCount + 1}`);
};

const callExternalAPI = async (stationCode) => {
    const url = `${API_URL_TiDE_REALY}?stationcode=${stationCode}`;
    const maxRetries = 2; // số lần thử lại thêm

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📡 Gọi API (lần ${attempt + 1}): ${url}`);

            const response = await axios.post(url, {}, {
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Hydrology-Dashboard/1.0'
                }
            });

            // Nếu thành công thì return luôn
            if (response.status === 200) {
                console.log(`✅ API response status: ${response.status}`);
                return response.data;
            }

            console.warn(`⚠️ API trả về status ${response.status}, thử lại...`);

        } catch (error) {
            if (attempt === maxRetries) {
                // Nếu là lần cuối thì throw lỗi
                if (error.code === 'ECONNABORTED') {
                    throw new Error(`API timeout after 10 seconds for station ${stationCode}`);
                } else if (error.response) {
                    throw new Error(`API error ${error.response.status}: ${error.response.statusText}`);
                } else if (error.request) {
                    throw new Error(`Network error: ${error.message}`);
                } else {
                    throw new Error(`API call failed: ${error.message}`);
                }
            } else {
                console.warn(`⚠️ Lỗi "${error.message}", thử lại...`);
            }
        }
    }
};


/**
 * Process and format tide realy data for database storage
 * @param {Array} rawData - Raw API data
 * @param {string} stationCode - Station code
 * @returns {Array} Processed data ready for database
 */
const processTideRealyData = (rawData, stationCode) => {
    if (!Array.isArray(rawData) || rawData.length === 0) {
        console.warn('Invalid or empty tide realy data');
        return [];
    }

    const processedData = rawData
        .map(item => {
            try {
                // Trừ đi 288.5 cho Vũng Tàu để đảm bảo độ chính xác
                let adjustedWaterLevel = item.GiaTri;
                if (stationCode === '4EC7BBAF-44E7-4DFA-BAED-4FB1217FBDA8') { // Vũng Tàu
                    adjustedWaterLevel = item.GiaTri - 288.5;
                    console.log(`🔧 Điều chỉnh giá trị Vũng Tàu: ${item.GiaTri} -> ${adjustedWaterLevel} (trừ 288.5)`);
                }

                return {
                    stationCode: stationCode,
                    timestamp: item.Timestamp,
                    utc: new Date(item.UTC),
                    vietnamTime: item.GioVietNam,
                    waterLevel: adjustedWaterLevel,
                    unit: 'cm',
                    dataType: 'real',
                    status: 'active'
                };
            } catch (error) {
                console.warn('Failed to process tide realy item:', item, error.message);
                return null;
            }
        })
        .filter(item => item !== null); // Remove invalid items

    console.log(`📊 Processed ${processedData.length} tide realy records from ${rawData.length} raw records`);
    return processedData;
};

const getTideRealyForce = async (stationCode) => {
    try {
        console.log(`🔄 Force refresh cho trạm: ${stationCode}`);

        // Step 1: Call external API
        const rawData = await callExternalAPI(stationCode);

        if (!rawData || !Array.isArray(rawData)) {
            return DataProcessingUtils.createOperationResult({
                success: false,
                message: 'No valid data received from API',
                operation: 'fetch_and_save_tide_realy'
            });
        }

        console.log(`📊 API trả về ${rawData.length} records`);

        // Step 2: Convert and remove duplicates from API data
        const convertedData = convertApiData(rawData);
        const uniqueData = removeDuplicateData(convertedData);
        console.log(`📊 Sau khi lọc trùng lặp: ${uniqueData.length} records`);

        // Step 3: Process data for database
        const processedData = processTideRealyData(uniqueData, stationCode);

        if (processedData.length === 0) {
            return DataProcessingUtils.createOperationResult({
                success: false,
                message: 'No valid processed data',
                operation: 'fetch_and_save_tide_realy'
            });
        }

        // Step 4: Complete data replacement (like Ho Dau Tieng services)
        const dbResult = await DatabaseUtils.replaceAllData(TideRealy, processedData);

        // Cập nhật thời gian gọi API và reset error count
        updateAPICallTime(stationCode);
        console.log(`✅ Đã force refresh và thay thế toàn bộ dữ liệu cho trạm: ${stationCode}`);

        return DataProcessingUtils.createOperationResult({
            success: true,
            message: `All tide realy data completely replaced with fresh API data for station ${stationCode}`,
            operation: 'fetch_and_save_tide_realy',
            inserted: dbResult.newRecords,
            deleted: dbResult.oldRecords,
            newRecords: dbResult.newRecords,
            dataRange: `${processedData.length} records processed`,
            rawData: uniqueData
        });

    } catch (error) {
        console.error('Error in getTideRealyForce:', error.message);
        // Tăng error count
        updateErrorCount(stationCode);

        throw new Error(`Failed to fetch or save tide realy data: ${error.message}`);
    }
}

const getTideRealy = async (stationCode) => {
    try {
        console.log(`🕐 Kiểm tra cache cho trạm: ${stationCode}`);
        console.log(`⏰ Thời gian hiện tại (GMT+7): ${getCurrentVietnamTime().toISOString()}`);

        //  Kiểm tra xem có cần gọi API không
        if (!(await shouldCallAPI(stationCode))) {
            const lastCallTime = apiCallCache.get(stationCode);
            console.log(`📦 Sử dụng cache - Lần gọi API cuối: ${lastCallTime?.toISOString()}`);

            // Lấy dữ liệu từ database thay vì gọi API
            const cachedData = await getTideRealyFromDB(stationCode, 100);
            return {
                data: cachedData,
                source: 'cache',
                lastUpdate: lastCallTime?.toISOString() || 'unknown'
            };
        }

        console.log(`🔄 Cần gọi API mới cho trạm: ${stationCode}`);

        // Step 1: Call external API
        const rawData = await callExternalAPI(stationCode);

        if (!rawData || !Array.isArray(rawData)) {
            throw new Error('Invalid API response format');
        }

        console.log(`📊 API trả về ${rawData.length} records`);

        // Step 2: Convert and remove duplicates from API data
        const convertedData = convertApiData(rawData);
        const uniqueData = removeDuplicateData(convertedData);
        console.log(`📊 Sau khi lọc trùng lặp: ${uniqueData.length} records`);

        // Step 3: Process data for database
        const processedData = processTideRealyData(uniqueData, stationCode);

        if (processedData.length === 0) {
            console.warn(`⚠️ Không có dữ liệu hợp lệ để lưu cho trạm: ${stationCode}`);
        } else {
            // Step 4: Complete data replacement (like Ho Dau Tieng services)
            await DatabaseUtils.replaceAllData(TideRealy, processedData);
            console.log(`✅ Đã thay thế toàn bộ dữ liệu cho trạm: ${stationCode}`);
        }

        // Cập nhật thời gian gọi API và reset error count
        updateAPICallTime(stationCode);

        return {
            data: uniqueData,
            source: 'api',
            lastUpdate: getCurrentVietnamTime().toISOString(),
            newRecords: processedData.length
        };
    } catch (error) {
        console.error('Error in getTideRealy:', error.message);

        // Tăng error count
        updateErrorCount(stationCode);

        // Nếu gọi API lỗi, thử lấy từ cache
        try {
            console.log(`🔄 API lỗi, thử lấy từ cache...`);
            const cachedData = await getTideRealyFromDB(stationCode, 50);
            return {
                data: cachedData,
                source: 'cache_fallback',
                lastUpdate: apiCallCache.get(stationCode)?.toISOString() || 'unknown',
                error: error.message
            };
        } catch (cacheError) {
            console.error('Error getting from cache:', cacheError.message);
            return {
                data: [],
                source: 'error',
                error: error.message,
                lastUpdate: getCurrentVietnamTime().toISOString()
            };
        }
    }
}

/**
 * Legacy function - now replaced by complete data replacement strategy
 * Keeping for backward compatibility but not actively used
 */
const saveTideRealyData = async (stationCode, data) => {
    console.warn('⚠️ saveTideRealyData is deprecated. Use complete replacement strategy instead.');
    // This function is now replaced by DatabaseUtils.replaceAllData() in the main flow
}

const getTideRealyFromDB = async (stationCode, limit = 100) => {
    try {
        const data = await TideRealy.getLatestData(stationCode, limit);
        return data.map(item => ({
            Timestamp: item.timestamp,
            UTC: item.utc,
            GioVietNam: item.vietnamTime,
            GiaTri: item.waterLevel, // Dữ liệu đã được lưu trong DB dưới dạng cm
            unit: 'cm'
        }));
    } catch (error) {
        console.error('Error getting tide realy data from DB:', error.message);
        return []; // Trả về array rỗng thay vì throw error
    }
}

const getCacheStatus = () => {
    const status = {};
    const now = getCurrentVietnamTime();

    for (const [stationCode, lastCallTime] of apiCallCache.entries()) {
        const timeDiff = now.getTime() - lastCallTime.getTime();
        const nextScheduledTime = getNextScheduledTime(lastCallTime);
        const isScheduled = isScheduledAPITime();
        const errorCount = errorCountCache.get(stationCode) || 0;

        status[stationCode] = {
            lastCallTime: lastCallTime.toISOString(),
            timeSinceLastCall: `${Math.round(timeDiff / (60 * 1000))} minutes`,
            nextScheduledCall: nextScheduledTime.toISOString(),
            isScheduledTime: isScheduled,
            shouldCallAPI: isScheduled && timeDiff >= 6 * 60 * 60 * 1000,
            errorCount: errorCount,
            isHealthy: errorCount <= 3
        };
    }

    return status;
};

// Hàm tính thời gian gọi API tiếp theo (mỗi 3 giờ)
const getNextScheduledTime = (lastCallTime) => {
    const now = getCurrentVietnamTime();
    const currentHour = now.getHours();

    // Tính giờ tiếp theo chia hết cho 3
    let nextHour = Math.ceil(currentHour / 3) * 3;

    // Nếu giờ tiếp theo vượt quá 24, reset về 0 giờ ngày hôm sau
    if (nextHour >= 24) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
    }

    const nextTime = new Date(now);
    nextTime.setHours(nextHour, 0, 0, 0);
    return nextTime;
};

// hàm cập nhật stationcode vào tideModel
// hàm nhận vào 2 thao số : location và stationCode , nếu location có trong tideModel thì cập nhật stationCode vào location đóq
const updateStationCode = async (location, stationCode) => {
    try {
        const result = await Tide.updateMany(
            { location },
            { $set: { stationCode } }
        );

        if (result.matchedCount === 0) {
            return { success: false, message: 'Location not found', location, stationCode };
        }

        return {
            success: true,
            message: `Updated ${result.modifiedCount} record(s)`,
            location,
            stationCode
        };
    } catch (error) {
        console.error('❌ Error updating station code:', error.message);
        throw error;
    }
};

module.exports = {
    getTideRealy,
    getTideRealyForce,
    getTideRealyFromDB,
    getCacheStatus,
    updateStationCode
}