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
            .map((item, index) => {
                try {
                    const processedItem = {
                        data_thoigian: new Date(item.data_thoigian),
                        data_thoigian_hienthi: item.data_thoigian_hienthi,
                        luuluongxa: item.luuluongxa,
                        luuluongcong: item.luuluongcong,
                        luuluongtran: item.luuluongtran,
                        luuluongthuydien: item.luuluongthuydien,
                        unit: 'm³/s',
                    };

                    // Log first few items for debugging
                    if (index < 2) {
                        console.log(`🔍 Luuluongxa processing item ${index}:`, {
                            original: item,
                            processed: processedItem
                        });
                    }

                    return processedItem;
                } catch (error) {
                    console.warn(`Failed to process Luuluongxa data item ${index}:`, item, error.message);
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
            console.warn('⚠️ validateLuuluongxaData: Invalid array or empty data');
            return false;
        }

        // Check if all items have required fields
        const invalidItems = [];
        const isValid = processedData.every((item, index) => {
            const itemValid =
                item.data_thoigian instanceof Date &&
                typeof item.data_thoigian_hienthi === 'string' &&
                typeof item.luuluongxa === 'number' &&
                typeof item.luuluongcong === 'number' &&
                (typeof item.luuluongtran === 'number' || item.luuluongtran === null) && // Allow null for luuluongtran
                (typeof item.luuluongthuydien === 'number' || item.luuluongthuydien === null) && // Allow null for luuluongthuydien
                item.unit === 'm³/s';

            if (!itemValid) {
                invalidItems.push({
                    index,
                    item,
                    checks: {
                        data_thoigian: item.data_thoigian instanceof Date,
                        data_thoigian_hienthi: typeof item.data_thoigian_hienthi === 'string',
                        luuluongxa: typeof item.luuluongxa === 'number',
                        luuluongcong: typeof item.luuluongcong === 'number',
                        luuluongtran: (typeof item.luuluongtran === 'number' || item.luuluongtran === null),
                        luuluongthuydien: (typeof item.luuluongthuydien === 'number' || item.luuluongthuydien === null),
                        unit: item.unit === 'm³/s'
                    }
                });
            }

            return itemValid;
        });

        if (!isValid && invalidItems.length > 0) {
            console.warn('⚠️ validateLuuluongxaData: Found invalid items:', invalidItems.slice(0, 3)); // Log first 3 invalid items
        }

        return isValid;
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

    /**
     * Transform Mekong API response to database format
     * @param {Array} rawData - Raw data từ API
     * @param {string} stationCode - Station code (CDO/TCH)
     * @param {string} stationName - Station name (ChauDoc/TanChau)
     * @returns {Array} Processed data
     */
    static processMekongData(rawData, stationCode, stationName) {
        try {
            console.log(`🔄 Processing Mekong data for station: ${stationName} (${stationCode})`);

            const processedData = rawData.map((item, index) => {
                // Validate required fields
                if (!item.date_gmt || item.val === undefined || item.val === null) {
                    console.warn(`⚠️ Skipping invalid item at index ${index}:`, item);
                    return null;
                }

                // Parse date
                let parsedDate;
                try {
                    parsedDate = new Date(item.date_gmt);
                    if (isNaN(parsedDate.getTime())) {
                        throw new Error(`Invalid date: ${item.date_gmt}`);
                    }
                } catch (dateError) {
                    console.warn(`⚠️ Skipping item with invalid date at index ${index}:`, item);
                    return null;
                }

                // Process item with station identification
                const processedItem = {
                    date_gmt: parsedDate,
                    val: parseFloat(item.val),
                    lineColor: item.lineColor || '#0066FF',
                    stationCode: stationCode,
                    stationName: stationName,
                    dataType: 'mekong',
                    source: 'mekong_api'
                };

                // Add optional fields if they exist
                if (item.ft !== undefined && item.ft !== null) {
                    processedItem.ft = parseFloat(item.ft);
                }
                if (item.as !== undefined && item.as !== null) {
                    processedItem.as = parseFloat(item.as);
                }
                if (item.av !== undefined && item.av !== null) {
                    processedItem.av = parseFloat(item.av);
                }
                if (item.P !== undefined && item.P !== null) {
                    processedItem.P = parseFloat(item.P);
                }

                return processedItem;
            }).filter(item => item !== null); // Remove null items

            console.log(`✅ Processed ${processedData.length} valid items for ${stationName} out of ${rawData.length} total`);

            // Sort by date
            processedData.sort((a, b) => a.date_gmt - b.date_gmt);

            return processedData;

        } catch (error) {
            console.error(`❌ Error processing Mekong data for ${stationName}:`, error.message);
            throw error;
        }
    }

    /**
     * Validate processed Mekong data
     * @param {Array} processedData - Processed data
     * @returns {boolean} True if data is valid
     */
    static validateMekongData(processedData) {
        if (!Array.isArray(processedData)) {
            console.error('❌ Processed data is not an array');
            return false;
        }

        if (processedData.length === 0) {
            console.error('❌ No valid data after processing');
            return false;
        }

        // Kiểm tra sample items
        const sampleSize = Math.min(5, processedData.length);
        for (let i = 0; i < sampleSize; i++) {
            const item = processedData[i];
            if (!item.date_gmt || item.val === undefined || item.val === null) {
                console.error(`❌ Invalid item at index ${i}:`, item);
                return false;
            }
        }

        console.log(`✅ Validation passed for ${processedData.length} items`);
        return true;
    }
}

module.exports = DataProcessingUtils;
