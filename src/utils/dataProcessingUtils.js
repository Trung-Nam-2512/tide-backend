/**
 * Data processing utilities for transforming API responses
 */
class DataProcessingUtils {
    /**
     * Transform HoDauTieng API response to database format
     * @param {Object} rawData - Raw API response
     * @returns {Array} Array of processed data objects
     */
    static processHoDauTiengData(rawData) {
        if (!rawData || !rawData.dtDataTable || !Array.isArray(rawData.dtDataTable)) {
            console.warn('Invalid API response structure');
            return [];
        }

        const processedData = rawData.dtDataTable
            .map(item => {
                try {
                    return {
                        data_thoigian: new Date(item.data_thoigian),
                        data_thoigian_hienthi: item.data_thoigian_hienthi,
                        mucnuocho: item.mucnuocho,
                        unit: 'm',
                    };
                } catch (error) {
                    console.warn('Failed to process data item:', item, error.message);
                    return null;
                }
            })
            .filter(item => item !== null); // Remove invalid items

        console.log(`📊 Processed ${processedData.length} records from ${rawData.dtDataTable.length} raw records`);
        return processedData;
    }

    /**
     * Validate processed data array
     * @param {Array} processedData - Array of processed data
     * @returns {boolean} True if data is valid
     */
    static validateProcessedData(processedData) {
        if (!Array.isArray(processedData) || processedData.length === 0) {
            return false;
        }

        // Check if all items have required fields
        return processedData.every(item =>
            item.data_thoigian instanceof Date &&
            typeof item.data_thoigian_hienthi === 'string' &&
            typeof item.mucnuocho === 'number' &&
            item.unit === 'm'
        );
    }

    /**
     * Create operation result object
     * @param {Object} options - Result options
     * @returns {Object} Standardized result object
     */
    static createOperationResult({
        success = true,
        message,
        operation,
        inserted = 0,
        deleted = 0,
        oldRecords = 0,
        newRecords = 0,
        dataRange = null,
        rawData = null,
        timestamp = new Date().toISOString()
    }) {
        const result = {
            success,
            message,
            timestamp
        };

        if (operation) result.operation = operation;
        if (inserted > 0) result.inserted = inserted;
        if (deleted > 0) result.deleted = deleted;
        if (oldRecords > 0) result.oldRecords = oldRecords;
        if (newRecords > 0) result.newRecords = newRecords;
        if (dataRange) result.dataRange = dataRange;

        // Only include rawData in development mode or when explicitly requested
        if (rawData && process.env.NODE_ENV !== 'production') {
            result.rawData = rawData;
        }

        return result;
    }

    /**
     * Transform Qden (flow rate) API response to database format
     * @param {Object} rawData - Raw API response
     * @returns {Array} Array of processed data objects
     */
    static processQdenData(rawData) {
        if (!rawData || !rawData.dtDataTable || !Array.isArray(rawData.dtDataTable)) {
            console.warn('Invalid Qden API response structure');
            return [];
        }

        const processedData = rawData.dtDataTable
            .map(item => {
                try {
                    return {
                        data_thoigian: new Date(item.data_thoigian),
                        data_thoigian_hienthi: item.data_thoigian_hienthi,
                        qden: item.qden,
                        unit: 'm³/s',
                    };
                } catch (error) {
                    console.warn('Failed to process Qden data item:', item, error.message);
                    return null;
                }
            })
            .filter(item => item !== null); // Remove invalid items

        console.log(`📊 Processed ${processedData.length} Qden records from ${rawData.dtDataTable.length} raw records`);
        return processedData;
    }

    /**
     * Validate processed Qden data array
     * @param {Array} processedData - Array of processed data
     * @returns {boolean} True if data is valid
     */
    static validateQdenData(processedData) {
        if (!Array.isArray(processedData) || processedData.length === 0) {
            return false;
        }

        // Check if all items have required fields
        return processedData.every(item =>
            item.data_thoigian instanceof Date &&
            typeof item.data_thoigian_hienthi === 'string' &&
            typeof item.qden === 'number' &&
            item.unit === 'm³/s'
        );
    }

    /**
     * Transform Luuluongxa API response to database format
     * @param {Object} rawData - Raw API response
     * @returns {Array} Array of processed data objects
     */
    static processLuuluongxaData(rawData) {
        if (!rawData || !rawData.dtData || !Array.isArray(rawData.dtData)) {
            console.warn('Invalid Luuluongxa API response structure');
            return [];
        }

        const processedData = rawData.dtData
            .map(item => {
                try {
                    return {
                        data_thoigian: new Date(item.data_thoigian),
                        data_thoigian_hienthi: item.data_thoigian_hienthi,
                        luuluongxa: item.luuluongxa,
                        luuluongcong: item.luuluongcong,
                        luuluongtran: item.luuluongtran,
                        luuluongthuydien: item.luuluongthuydien,
                        unit: 'm³/s',
                    };
                } catch (error) {
                    console.warn('Failed to process Luuluongxa data item:', item, error.message);
                    return null;
                }
            })
            .filter(item => item !== null); // Remove invalid items

        console.log(`📊 Processed ${processedData.length} Luuluongxa records from ${rawData.dtData.length} raw records`);
        return processedData;
    }

    /**
     * Validate processed Luuluongxa data array
     * @param {Array} processedData - Array of processed data
     * @returns {boolean} True if data is valid
     */
    static validateLuuluongxaData(processedData) {
        if (!Array.isArray(processedData) || processedData.length === 0) {
            return false;
        }

        // Check if all items have required fields
        return processedData.every(item =>
            item.data_thoigian instanceof Date &&
            typeof item.data_thoigian_hienthi === 'string' &&
            typeof item.luuluongxa === 'number' &&
            typeof item.luuluongcong === 'number' &&
            typeof item.luuluongtran === 'number' &&
            (typeof item.luuluongthuydien === 'number' || item.luuluongthuydien === null) && // Allow null for luuluongthuydien
            item.unit === 'm³/s'
        );
    }

    /**
     * Create statistics object
     * @param {Object} options - Statistics options
     * @returns {Object} Statistics object
     */
    static createStatsResult({
        totalRecords = 0,
        oldestRecord = null,
        newestRecord = null,
        dataRange = null
    }) {
        return {
            totalRecords,
            oldestRecord: oldestRecord ? oldestRecord.toISOString() : null,
            newestRecord: newestRecord ? newestRecord.toISOString() : null,
            dataRange,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = DataProcessingUtils;
