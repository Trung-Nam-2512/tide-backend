const Qden = require('../models/qDenModel');
const { api } = require('../config/config');
const DateUtils = require('../utils/dateUtils');
const ApiUtils = require('../utils/apiUtils');
const DataProcessingUtils = require('../utils/dataProcessingUtils');
const DatabaseUtils = require('../utils/databaseUtils');

const fetchAndSave = async (payload) => {
    try {
        // Step 1: Create API request payload
        const requestPayload = ApiUtils.createHoDauTiengPayload(payload.data, payload.token);

        // Step 2: Call external API (try regular endpoint for Qden data)
        const rawData = await ApiUtils.callHoDauTiengApi(api.tide_ho_dau_tien.apiUrl_forecast, requestPayload);

        // Step 3: Validate API response
        if (!ApiUtils.validateApiResponse(rawData)) {
            return DataProcessingUtils.createOperationResult({
                success: false,
                message: 'No valid data received from API',
                operation: 'fetch_and_save_qden'
            });
        }

        // Step 4: Process API data for Qden
        const processedData = DataProcessingUtils.processQdenData(rawData);

        if (!DataProcessingUtils.validateQdenData(processedData)) {
            return DataProcessingUtils.createOperationResult({
                success: false,
                message: 'Failed to process Qden API data',
                operation: 'fetch_and_save_qden'
            });
        }

        // Step 5: Replace all data in database
        const dbResult = await DatabaseUtils.replaceAllData(Qden, processedData);
        const dateRange = DateUtils.getDateRange(processedData);

        return DataProcessingUtils.createOperationResult({
            message: 'All Qden data completely replaced with fresh API data',
            operation: 'fetch_and_save_qden',
            inserted: dbResult.newRecords,
            deleted: dbResult.oldRecords,
            newRecords: dbResult.newRecords, // Thêm field này
            dataRange: dateRange,
            rawData: rawData
        });

    } catch (err) {
        console.error('❌ Error in fetchAndSave (Qden):', err.message);
        throw new Error(`Failed to fetch or save Qden data: ${err.message}`);
    }
};

const getData = async (startDate, endDate) => {
    try {
        let query = {};

        if (startDate && endDate) {
            query.data_thoigian = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else {
            // Use default date range (last 10 days for Qden data)
            const dateRange = DateUtils.getDefaultDateRange(10);
            query.data_thoigian = {
                $gte: dateRange.start,
                $lte: dateRange.end
            };
        }

        return await DatabaseUtils.findWithDefaults(Qden, query);
    } catch (error) {
        console.error('❌ Error in getData (Qden):', error.message);
        throw new Error(`Failed to get Qden data: ${error.message}`);
    }
};

module.exports = { fetchAndSave, getData };