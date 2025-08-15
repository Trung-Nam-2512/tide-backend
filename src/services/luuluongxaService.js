const Luuluongxa = require('../models/luuluongxaModel');
const { api } = require('../config/config');
const DateUtils = require('../utils/dateUtils');
const ApiUtils = require('../utils/apiUtils');
const DataProcessingUtils = require('../utils/dataProcessingUtils');
const DatabaseUtils = require('../utils/databaseUtils');

const fetchAndSave = async (payload) => {
    try {
        // console.log('payload gửi lên : :::: ', payload);

        // Nếu payload.data là string thì parse, nếu là object thì dùng thẳng
        const input = (typeof payload.data === 'string')
            ? JSON.parse(payload.data)
            : payload.data;
        // Step 1: Create API request payload
        const requestPayload = ApiUtils.createLuuluongxaPayload(input, payload.token);

        // Step 2: Call external API (use QXA endpoint for Luuluongxa data)
        const rawData = await ApiUtils.callHoDauTiengApi(api.tide_ho_dau_tien_QXA.apiUrl_forecast, requestPayload);

        // Step 3: Validate API response
        if (!ApiUtils.validateApiResponse(rawData)) {
            return DataProcessingUtils.createOperationResult({
                success: false,
                message: 'No valid data received from API',
                operation: 'fetch_and_save_luuluongxa'
            });
        }

        // Step 4: Process API data for Luuluongxa
        const processedData = DataProcessingUtils.processLuuluongxaData(rawData);

        if (!DataProcessingUtils.validateLuuluongxaData(processedData)) {
            return DataProcessingUtils.createOperationResult({
                success: false,
                message: 'Failed to process Luuluongxa API data',
                operation: 'fetch_and_save_luuluongxa'
            });
        }

        // Step 5: Replace all data in database
        const dbResult = await DatabaseUtils.replaceAllData(Luuluongxa, processedData);
        const dateRange = DateUtils.getDateRange(processedData);

        return DataProcessingUtils.createOperationResult({
            message: 'All Luuluongxa data completely replaced with fresh API data',
            operation: 'fetch_and_save_luuluongxa',
            inserted: dbResult.newRecords,
            deleted: dbResult.oldRecords,
            newRecords: dbResult.newRecords, // Thêm field này
            dataRange: dateRange,
            rawData: rawData
        });

    } catch (err) {
        console.error('❌ Error in fetchAndSave (Luuluongxa):', err.message);
        throw new Error(`Failed to fetch or save Luuluongxa data: ${err.message}`);
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
            // Use default date range (last 3 days for Luuluongxa data)
            const dateRange = DateUtils.getDefaultDateRange(3);
            query.data_thoigian = {
                $gte: dateRange.start,
                $lte: dateRange.end
            };
        }

        return await DatabaseUtils.findWithDefaults(Luuluongxa, query);
    } catch (error) {
        console.error('❌ Error in getData (Luuluongxa):', error.message);
        throw new Error(`Failed to get Luuluongxa data: ${error.message}`);
    }
};

module.exports = { fetchAndSave, getData };