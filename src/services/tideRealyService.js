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
    const currentHour = now.getHours();
    // Gọi API vào các giờ: 0, 3, 6, 9, 12, 15, 18, 21
    return currentHour % 3 === 0;
};

// Hàm kiểm tra xem có cần gọi API không (luôn gọi API)
const shouldCallAPI = async (stationCode) => {
    console.log(`🚀 Trạm ${stationCode}: Luôn gọi API (đã bỏ qua kiểm tra giờ)`);
    return true; // Luôn trả về true để gọi API
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
                // else if (stationCode === 'CDO') {
                //     adjustedWaterLevel = item.GiaTri - 288.5;
                //     console.log(`🔧 Điều chỉnh giá trị Vũng Tàu: ${item.GiaTri} -> ${adjustedWaterLevel} (trừ 288.5)`);
                // }

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

        // Validate processed data before database operation
        const validData = processedData.filter(item => {
            return item &&
                item.stationCode &&
                item.timestamp &&
                item.utc &&
                typeof item.waterLevel === 'number' &&
                !isNaN(item.waterLevel);
        });

        if (validData.length !== processedData.length) {
            console.warn(`⚠️ Filtered out ${processedData.length - validData.length} invalid records`);
        }

        if (validData.length === 0) {
            return DataProcessingUtils.createOperationResult({
                success: false,
                message: 'No valid data after validation',
                operation: 'fetch_and_save_tide_realy'
            });
        }

        console.log(`📊 Processed data ready for database: ${validData.length} records (${processedData.length} total)`);

        // Step 4: SAFE station-specific data replacement
        const dbResult = await DatabaseUtils.replaceStationData(TideRealy, stationCode, validData);

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
            totalRecords: dbResult.totalRecords || processedData.length,
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

        // Kiểm tra xem có cần gọi API không (luôn gọi API)
        if (!(await shouldCallAPI(stationCode))) {
            const lastCallTime = apiCallCache.get(stationCode);
            console.log(`📦 Sử dụng cache - Lần gọi API cuối: ${lastCallTime?.toISOString()}`);

            // Lấy dữ liệu từ database thay vì gọi API
            const cachedData = await getTideRealyFromDB(stationCode, 100);
            return {
                data: cachedData,
                source: 'cache',
                lastUpdate: lastCallTime?.toISOString() || 'unknown',
                totalRecords: cachedData.length
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
            // Validate processed data before database operation
            const validData = processedData.filter(item => {
                return item &&
                    item.stationCode &&
                    item.timestamp &&
                    item.utc &&
                    typeof item.waterLevel === 'number' &&
                    !isNaN(item.waterLevel);
            });

            if (validData.length !== processedData.length) {
                console.warn(`⚠️ Filtered out ${processedData.length - validData.length} invalid records`);
            }

            if (validData.length > 0) {
                // Step 4: SAFE station-specific data replacement
                await DatabaseUtils.replaceStationData(TideRealy, stationCode, validData);
                console.log(`✅ Đã thay thế dữ liệu cho trạm: ${stationCode} (station-specific)`);
            } else {
                console.warn(`⚠️ Không có dữ liệu hợp lệ sau khi validation cho trạm: ${stationCode}`);
            }
        }

        // Cập nhật thời gian gọi API và reset error count
        updateAPICallTime(stationCode);

        return {
            data: uniqueData,
            source: 'api',
            lastUpdate: getCurrentVietnamTime().toISOString(),
            newRecords: processedData.length,
            totalRecords: uniqueData.length
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
                totalRecords: cachedData.length,
                error: error.message
            };
        } catch (cacheError) {
            console.error('Error getting from cache:', cacheError.message);
            return {
                data: [],
                source: 'error',
                error: error.message,
                totalRecords: 0,
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

        // Check for duplicates before mapping
        const timestampMap = new Map();
        data.forEach((item, index) => {
            if (timestampMap.has(item.timestamp)) {
                console.warn(`⚠️ Duplicate timestamp found in DB: ${item.timestamp} at index ${index}`);
                console.warn(`Previous:`, timestampMap.get(item.timestamp));
                console.warn(`Current:`, item);
            } else {
                timestampMap.set(item.timestamp, item);
            }
        });

        const mappedData = data.map(item => ({
            Timestamp: item.timestamp,
            UTC: item.utc,
            GioVietNam: item.vietnamTime,
            GiaTri: item.waterLevel, // Dữ liệu đã được lưu trong DB dưới dạng cm
            unit: 'cm'
        }));

        console.log(`📊 getTideRealyFromDB: Retrieved ${data.length} records, mapped to ${mappedData.length} records`);

        return mappedData;
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
            shouldCallAPI: true, // Luôn gọi API (đã bỏ qua kiểm tra giờ)
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
// hàm nhận vào 2 tham số: location và stationCode, nếu location có trong tideModel thì cập nhật stationCode vào location đó
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