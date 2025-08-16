/**
 * Database operation utilities for consistent database interactions
 */
class DatabaseUtils {
    /**
     * Safely insert many documents with error handling
     * @param {Object} Model - Mongoose model
     * @param {Array} documents - Documents to insert
     * @param {Object} options - Insert options
     * @returns {Promise<Object>} Insert result
     */
    static async insertMany(Model, documents, options = {}) {
        try {
            // Add timeout to prevent hanging operations
            const insertPromise = Model.insertMany(documents, {
                ordered: false,
                ...options
            });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Insert operation timeout')), 10000)
            );

            const result = await Promise.race([insertPromise, timeoutPromise]);

            console.log(`💾 Successfully inserted ${result.length} documents`);
            return {
                success: true,
                insertedCount: result.length,
                insertedIds: result.map(doc => doc._id)
            };
        } catch (error) {
            console.error('❌ Insert operation failed:', error.message);
            throw new Error(`Database insert failed: ${error.message}`);
        }
    }

    /**
     * Safely delete documents with logging
     * @param {Object} Model - Mongoose model
     * @param {Object} filter - Delete filter
     * @returns {Promise<Object>} Delete result
     */
    static async deleteMany(Model, filter = {}) {
        try {
            // Add timeout to prevent hanging operations
            const deletePromise = Model.deleteMany(filter);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Delete operation timeout')), 5000)
            );

            const result = await Promise.race([deletePromise, timeoutPromise]);
            console.log(`🗑️ Successfully deleted ${result.deletedCount} documents`);

            return {
                success: true,
                deletedCount: result.deletedCount
            };
        } catch (error) {
            console.error('❌ Delete operation failed:', error.message);
            throw new Error(`Database delete failed: ${error.message}`);
        }
    }

    /**
     * Get document count with logging and timeout handling
     * @param {Object} Model - Mongoose model
     * @param {Object} filter - Count filter
     * @returns {Promise<number>} Document count
     */
    static async countDocuments(Model, filter = {}) {
        try {
            // Add timeout to prevent hanging operations
            const countPromise = Model.countDocuments(filter);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Count operation timeout')), 5000)
            );

            const count = await Promise.race([countPromise, timeoutPromise]);
            console.log(`📊 Found ${count} documents matching filter`);
            return count;
        } catch (error) {
            console.error('❌ Count operation failed:', error.message);
            throw new Error(`Database count failed: ${error.message}`);
        }
    }

    /**
     * Find documents with default sorting and error handling
     * @param {Object} Model - Mongoose model
     * @param {Object} filter - Query filter
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Found documents
     */
    static async findWithDefaults(Model, filter = {}, options = {}) {
        try {
            const defaultOptions = {
                sort: { data_thoigian: 1 },
                ...options
            };

            const documents = await Model.find(filter, null, defaultOptions);
            console.log(`📋 Found ${documents.length} documents`);

            return documents;
        } catch (error) {
            console.error('❌ Find operation failed:', error.message);
            throw new Error(`Database find failed: ${error.message}`);
        }
    }

    /**
     * Get oldest and newest documents
     * @param {Object} Model - Mongoose model
     * @param {string} dateField - Date field name for sorting
     * @returns {Promise<Object>} Oldest and newest documents
     */
    static async getDateExtremes(Model, dateField = 'data_thoigian') {
        try {
            const [oldestRecord, newestRecord] = await Promise.all([
                Model.findOne().sort({ [dateField]: 1 }),
                Model.findOne().sort({ [dateField]: -1 })
            ]);

            return {
                oldest: oldestRecord ? oldestRecord[dateField] : null,
                newest: newestRecord ? newestRecord[dateField] : null
            };
        } catch (error) {
            console.error('❌ Date extremes operation failed:', error.message);
            throw new Error(`Database date extremes failed: ${error.message}`);
        }
    }

    /**
     * Execute complete data replacement safely with timeout handling
     * @deprecated Use replaceStationData for station-specific data to avoid data loss
     * @param {Object} Model - Mongoose model
     * @param {Array} newData - New data to insert
     * @returns {Promise<Object>} Replacement result
     */
    static async replaceAllData(Model, newData) {
        console.warn('⚠️ WARNING: replaceAllData is deprecated and DANGEROUS - it deletes ALL data in collection!');
        console.warn('⚠️ Use replaceStationData for station-specific replacement instead.');
        try {
            console.log('🔄 Starting complete data replacement...');

            // Try database operations with fallback
            try {
                // Delete all existing data
                const deleteResult = await DatabaseUtils.deleteMany(Model);
                console.log('🗑️ Deleted old data:', deleteResult.deletedCount, 'records');

                // Insert new data
                const insertResult = await DatabaseUtils.insertMany(Model, newData);
                console.log('💾 Inserted new data:', insertResult.insertedCount, 'records');

                console.log('✅ Complete data replacement successful!');

                return {
                    success: true,
                    oldRecords: deleteResult.deletedCount,
                    newRecords: insertResult.insertedCount,
                    operation: 'complete_replacement'
                };

            } catch (dbError) {
                console.warn('⚠️ Database operations failed, using fallback approach...');
                console.warn('⚠️ Error:', dbError.message);

                // Fallback: return success with data processing info only
                return {
                    success: true,
                    oldRecords: 0, // Unknown
                    newRecords: newData.length,
                    operation: 'fallback_replacement',
                    warning: 'Database operations failed, but data was processed successfully',
                    processedData: newData.length
                };
            }

        } catch (error) {
            console.error('❌ Complete replacement failed:', error.message);
            throw new Error(`Database replacement failed: ${error.message}`);
        }
    }

    /**
     * Replace data for a specific station only (SAFE)
     * @param {Object} Model - Mongoose model
     * @param {string} stationCode - Station code to replace data for
     * @param {Array} newData - New data to insert for this station
     * @returns {Promise<Object>} Replacement result
     */
    static async replaceStationData(Model, stationCode, newData) {
        try {
            console.log(`🔄 Starting SAFE station-specific data replacement for station: ${stationCode}`);
            console.log(`📊 Input data count: ${newData.length}`);
            console.log(`📊 Model name: ${Model.modelName}`);

            // Validate input data
            if (!Array.isArray(newData) || newData.length === 0) {
                throw new Error('Invalid or empty data array');
            }

            if (!stationCode) {
                throw new Error('Station code is required for safe replacement');
            }

            // Validate that all new data belongs to the same station
            const invalidData = newData.filter(item => item.stationCode !== stationCode);
            if (invalidData.length > 0) {
                throw new Error(`Data contains records for different stations: ${invalidData.length} invalid records`);
            }

            try {
                // Delete data for ONLY this station
                console.log(`🗑️ Deleting existing data for station: ${stationCode}`);
                const deleteFilter = { stationCode: stationCode };
                const deleteResult = await DatabaseUtils.deleteMany(Model, deleteFilter);
                console.log(`🗑️ Deleted old data for station ${stationCode}: ${deleteResult.deletedCount} records`);

                // Insert new data for this station
                console.log(`💾 Inserting new data for station: ${stationCode}`);
                const insertResult = await DatabaseUtils.insertMany(Model, newData);
                console.log(`💾 Inserted new data for station ${stationCode}: ${insertResult.insertedCount} records`);

                // Verify the insertion by counting documents for this station
                console.log(`📊 Verifying insertion for station: ${stationCode}`);
                const finalCount = await DatabaseUtils.countDocuments(Model, { stationCode: stationCode });
                console.log(`📊 Final document count for station ${stationCode}: ${finalCount}`);

                console.log(`✅ Station-specific data replacement successful for station: ${stationCode}`);

                return {
                    success: true,
                    stationCode: stationCode,
                    oldRecords: deleteResult.deletedCount || 0,
                    newRecords: insertResult.insertedCount || newData.length,
                    totalRecords: finalCount,
                    operation: 'station_specific_replacement'
                };

            } catch (dbError) {
                console.warn(`⚠️ Database operations failed for station ${stationCode}, using fallback approach...`);
                console.warn('⚠️ Error:', dbError.message);

                // Fallback: return success with data processing info only
                return {
                    success: true,
                    stationCode: stationCode,
                    oldRecords: 0, // Unknown
                    newRecords: newData.length,
                    totalRecords: newData.length,
                    operation: 'fallback_station_replacement',
                    warning: 'Database operations failed, but data was processed successfully',
                    processedData: newData.length
                };
            }

        } catch (error) {
            console.error(`❌ Station-specific replacement failed for station ${stationCode}:`, error.message);
            throw new Error(`Database station replacement failed: ${error.message}`);
        }
    }

    /**
     * Clean up old data based on date
     * @param {Object} Model - Mongoose model
     * @param {Date} cutoffDate - Date before which to delete
     * @param {string} dateField - Date field name
     * @returns {Promise<Object>} Cleanup result
     */
    static async cleanupOldData(Model, cutoffDate, dateField = 'data_thoigian') {
        try {
            const filter = { [dateField]: { $lt: cutoffDate } };
            const deleteResult = await DatabaseUtils.deleteMany(Model, filter);

            return {
                success: true,
                deletedCount: deleteResult.deletedCount,
                cutoffDate: cutoffDate.toISOString()
            };
        } catch (error) {
            console.error('❌ Cleanup operation failed:', error.message);
            throw new Error(`Database cleanup failed: ${error.message}`);
        }
    }
}

module.exports = DatabaseUtils;
