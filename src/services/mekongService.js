const Mekong = require('../models/mekongModel');
const { api } = require('../config/config');
const DateUtils = require('../utils/dateUtils');
const DataProcessingUtils = require('../utils/dataProcessingUtils');
const DatabaseUtils = require('../utils/databaseUtils');
const ApiUtils = require('../utils/apiUtils');

/**
 * Fetch dữ liệu từ Mekong API cho một station cụ thể
 * @param {string} stationCode - Station code (CDO/TCH)
 * @param {string} stationName - Station name (ChauDoc/TanChau)
 * @returns {Promise<Object>} Operation result
 */
const fetchAndSaveMekongData = async (stationCode = 'CDO', stationName = 'ChauDoc') => {
    try {
        console.log(`🌊 Bắt đầu fetch dữ liệu Mekong API cho ${stationName} (${stationCode})...`);

        // Get API URL for specific station
        const apiUrl = stationCode === 'CDO' ? api.mekong.apiUrl_ChauDoc : api.mekong.apiUrl_Tanchau;
        // Step 1: Call Mekong API
        const rawResponse = await ApiUtils.callMekongApi(apiUrl);

        console.log(`📡 Received ${typeof rawResponse === 'string' ? rawResponse.length : 'non-string'} chars from ${stationName} API`);

        // Step 2: Parse string response to array
        const rawData = ApiUtils.parseMekongApiResponse(rawResponse);

        if (!ApiUtils.validateMekongApiResponse(rawData)) {
            console.log('❌ Validation failed for parsed data');
            return DataProcessingUtils.createOperationResult({
                success: false,
                message: `No valid data received from Mekong API for ${stationName}`,
                operation: 'fetch_and_save_mekong'
            });
        }

        console.log(`📊 API trả về ${rawData.length} records cho ${stationName}`);

        // Step 2: Process và validate dữ liệu
        const processedData = DataProcessingUtils.processMekongData(rawData, stationCode, stationName);

        if (!DataProcessingUtils.validateMekongData(processedData)) {
            return DataProcessingUtils.createOperationResult({
                success: false,
                message: `Failed to process Mekong API data for ${stationName}`,
                operation: 'fetch_and_save_mekong'
            });
        }

        // Step 3: Replace station-specific data in database (SAFE - only affects this station)
        const dbResult = await DatabaseUtils.replaceStationData(Mekong, stationCode, processedData);

        // Calculate date range safely
        let dateRange = null;
        try {
            dateRange = DateUtils.getDateRange(processedData.map(item => ({ date: item.date_gmt })));
        } catch (dateError) {
            console.warn(`⚠️ Could not calculate date range for ${stationName}:`, dateError.message);
            // Fallback: calculate manually
            const dates = processedData.map(item => item.date_gmt).filter(date => date instanceof Date);
            if (dates.length > 0) {
                dateRange = {
                    start: new Date(Math.min(...dates)),
                    end: new Date(Math.max(...dates))
                };
            }
        }

        return DataProcessingUtils.createOperationResult({
            success: true,
            message: `Mekong data for ${stationName} fetched and saved successfully`,
            operation: 'fetch_and_save_mekong',
            dataPoints: processedData.length,
            dateRange: dateRange,
            database: dbResult,
            stationCode: stationCode,
            stationName: stationName
        });

    } catch (error) {
        console.error(`❌ Error in fetchAndSaveMekongData for ${stationName}:`, error.message);
        return DataProcessingUtils.createOperationResult({
            success: false,
            message: error.message,
            operation: 'fetch_and_save_mekong',
            error: error.stack,
            stationCode: stationCode,
            stationName: stationName
        });
    }
};

/**
 * Fetch dữ liệu từ tất cả Mekong stations
 * @returns {Promise<Object>} Operation result
 */
const fetchAndSaveAllMekongData = async () => {
    try {
        console.log('🌊 Bắt đầu fetch dữ liệu từ tất cả Mekong stations...');

        const stations = [
            { code: 'CDO', name: 'ChauDoc' },
            { code: 'TCH', name: 'TanChau' }
        ];

        const results = [];

        for (const station of stations) {
            try {
                console.log(`📡 Fetching data for ${station.name}...`);
                const result = await fetchAndSaveMekongData(station.code, station.name);
                results.push(result);
            } catch (error) {
                console.error(`❌ Error fetching data for ${station.name}:`, error.message);
                results.push({
                    success: false,
                    stationCode: station.code,
                    stationName: station.name,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const totalDataPoints = results.reduce((sum, r) => sum + (r.dataPoints || 0), 0);

        return DataProcessingUtils.createOperationResult({
            success: successCount > 0,
            message: `Completed fetch for ${successCount}/${stations.length} stations`,
            operation: 'fetch_and_save_all_mekong',
            results: results,
            totalDataPoints: totalDataPoints,
            successCount: successCount,
            totalStations: stations.length
        });

    } catch (error) {
        console.error('❌ Error in fetchAndSaveAllMekongData:', error.message);
        return DataProcessingUtils.createOperationResult({
            success: false,
            message: error.message,
            operation: 'fetch_and_save_all_mekong',
            error: error.stack
        });
    }
};



/**
 * Lấy dữ liệu Mekong từ database
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 * @param {number} limit - Limit number of results
 * @returns {Promise<Array>} Mekong data
 */
const getMekongData = async (fromDate = null, toDate = null, limit = 1000) => {
    try {
        console.log('📊 Getting Mekong data from database...');

        let query = {};

        // Add date range if provided
        if (fromDate || toDate) {
            query.date_gmt = {};
            if (fromDate) {
                query.date_gmt.$gte = fromDate;
                console.log(`📅 From date: ${fromDate.toISOString()}`);
            }
            if (toDate) {
                query.date_gmt.$lte = toDate;
                console.log(`📅 To date: ${toDate.toISOString()}`);
            }
        }

        const data = await Mekong.find(query)
            .sort({ date_gmt: 1 })
            .limit(limit);

        console.log(`✅ Found ${data.length} Mekong records`);

        return data;

    } catch (error) {
        console.error('❌ Error getting Mekong data:', error.message);
        throw error;
    }
};

/**
 * Lấy dữ liệu Mekong gần nhất
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Recent Mekong data
 */
const getRecentMekongData = async (days = 7) => {
    try {
        const now = new Date();
        const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        console.log(`📅 Getting Mekong data for last ${days} days`);

        return await getMekongData(daysAgo, now);

    } catch (error) {
        console.error('❌ Error getting recent Mekong data:', error.message);
        throw error;
    }
};

/**
 * Lấy thống kê dữ liệu Mekong
 * @returns {Promise<Object>} Statistics
 */
const getMekongStats = async () => {
    try {
        console.log('📊 Getting Mekong statistics...');

        const totalRecords = await Mekong.countDocuments();

        const latestRecord = await Mekong.findOne()
            .sort({ date_gmt: -1 });

        const oldestRecord = await Mekong.findOne()
            .sort({ date_gmt: 1 });

        // Aggregate statistics
        const stats = await Mekong.aggregate([
            {
                $group: {
                    _id: null,
                    avgVal: { $avg: '$val' },
                    minVal: { $min: '$val' },
                    maxVal: { $max: '$val' },
                    avgFt: { $avg: '$ft' },
                    avgAs: { $avg: '$as' },
                    avgAv: { $avg: '$av' }
                }
            }
        ]);

        const result = {
            totalRecords,
            dateRange: {
                from: oldestRecord?.date_gmt,
                to: latestRecord?.date_gmt
            },
            statistics: stats[0] || {},
            lastUpdate: latestRecord?.updatedAt
        };

        console.log(`✅ Mekong statistics calculated:`, result);

        return result;

    } catch (error) {
        console.error('❌ Error getting Mekong statistics:', error.message);
        throw error;
    }
};

module.exports = {
    fetchAndSaveMekongData,
    fetchAndSaveAllMekongData,
    getMekongData,
    getRecentMekongData,
    getMekongStats
};
