/**
 * NEW BINHDUONG SERVICE WITH BACKWARD COMPATIBILITY
 * Service layer mới tối ưu hiệu suất nhưng vẫn tương thích với API cũ
 */

const axios = require('axios');
const mongoose = require('mongoose');
const { StationMetadataV2, CurrentDataV2, TimeseriesBucketV2 } = require('../models/new_timeseries_schema');

// MongoDB connection will be handled by server.js

class BinhDuongServiceV2 {
    constructor() {
        this.API_URL = process.env.API_URL_BINH_DUONG ||
            'https://thongtinmoitruong.quantracbinhduong.vn/api/station-auto-logs?stationType=5f55a0292fd98d0011cf5809';
    }

    // ==================== DATA FETCHING ====================

    async fetchAndSaveData() {
        try {
            const response = await axios.get(this.API_URL);
            const data = response.data.data;

            if (!data || !Array.isArray(data)) {
                throw new Error('Dữ liệu từ API không hợp lệ');
            }

            console.log(`📡 Fetched ${data.length} stations data`);
            const operations = [];

            for (const stationData of data) {
                await this.saveStationData(stationData);
                operations.push(stationData.key);
            }

            console.log(`✅ Saved data for ${operations.length} stations`);
            return { success: true, stationsUpdated: operations.length };

        } catch (error) {
            console.error('❌ Error fetching/saving data:', error.message);
            throw error;
        }
    }

    async saveStationData(stationData) {
        const receivedAt = new Date(stationData.receivedAt);
        const bucketDate = new Date(receivedAt);
        bucketDate.setHours(0, 0, 0, 0); // Start of day

        try {
            // 1. Update/Create station metadata
            await StationMetadataV2.findOneAndUpdate(
                { key: stationData.key },
                {
                    key: stationData.key,
                    name: stationData.name,
                    address: stationData.address,
                    mapLocation: stationData.mapLocation,
                    province: stationData.province,
                    stationType: stationData.stationType,
                    parameters: this.extractParameters(stationData.measuringLogs),
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            );

            // 2. Update current data
            await CurrentDataV2.findOneAndUpdate(
                { stationKey: stationData.key },
                {
                    stationKey: stationData.key,
                    receivedAt: receivedAt,
                    data: this.transformMeasuringLogs(stationData.measuringLogs),
                    rawData: stationData.measuringLogs,
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            );

            // 3. Add to timeseries bucket
            const measurement = {
                timestamp: receivedAt,
                data: this.transformMeasuringLogs(stationData.measuringLogs),
                quality: 'good'
            };

            await TimeseriesBucketV2.findOneAndUpdate(
                {
                    stationKey: stationData.key,
                    bucketDate: bucketDate
                },
                {
                    $push: { measurements: measurement },
                    $inc: { count: 1 },
                    $set: { updatedAt: new Date() }
                },
                { upsert: true, new: true }
            );

        } catch (error) {
            console.error(`❌ Error saving data for ${stationData.key}:`, error.message);
            throw error;
        }
    }

    // ==================== DATA RETRIEVAL (BACKWARD COMPATIBLE) ====================

    /**
     * Lấy tất cả stations - Format cũ cho backward compatibility
     * @returns {Array} Array of stations with old format
     */
    async getAllStations() {
        try {
            const metadata = await StationMetadataV2.find({ isActive: true }).sort({ name: 1 });
            const currentDataList = await CurrentDataV2.find({});

            // Create map for quick lookup
            const currentDataMap = new Map();
            currentDataList.forEach(cd => {
                currentDataMap.set(cd.stationKey, cd);
            });

            // Transform to old format
            const stations = await Promise.all(metadata.map(async station => {
                const currentData = currentDataMap.get(station.key);

                return {
                    key: station.key,
                    name: station.name,
                    address: station.address,
                    mapLocation: station.mapLocation,
                    province: station.province,
                    stationType: station.stationType,
                    currentData: currentData ? {
                        receivedAt: currentData.receivedAt,
                        measuringLogs: this.reverseTransformData(currentData.data)
                    } : null,
                    // For backward compatibility, we'll include a small recent history
                    history: await this.getRecentHistoryForStation(station.key, 10)
                };
            }));

            return stations;

        } catch (error) {
            console.error('❌ Error getting all stations:', error.message);
            throw error;
        }
    }

    /**
     * Lấy lịch sử của station - Format cũ cho backward compatibility
     * @param {String} stationKey
     * @param {Date} start
     * @param {Date} end
     * @returns {Object} Station history in old format
     */
    async getStationHistory(stationKey, start, end) {
        try {
            const startDate = new Date(start);
            const endDate = new Date(end);

            // Get buckets within date range
            const buckets = await TimeseriesBucketV2.find({
                stationKey: stationKey,
                bucketDate: {
                    $gte: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
                    $lte: new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
                }
            }).sort({ bucketDate: 1 });

            // Flatten measurements and filter by exact time range
            const history = [];
            buckets.forEach(bucket => {
                bucket.measurements.forEach(measurement => {
                    const measurementTime = new Date(measurement.timestamp);
                    if (measurementTime >= startDate && measurementTime <= endDate) {
                        history.push({
                            timestamp: measurement.timestamp,
                            measuringLogs: this.reverseTransformData(measurement.data)
                        });
                    }
                });
            });

            // Sort by timestamp
            history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            // Return in old format
            return {
                key: stationKey,
                history: history
            };

        } catch (error) {
            console.error(`❌ Error getting history for ${stationKey}:`, error.message);
            throw error;
        }
    }

    /**
     * Lấy recent history (helper function)
     */
    async getRecentHistoryForStation(stationKey, limit = 10) {
        try {
            const recentBucket = await TimeseriesBucketV2.findOne({
                stationKey: stationKey
            }).sort({ bucketDate: -1 });

            if (!recentBucket || !recentBucket.measurements) {
                return [];
            }

            // Get last N measurements
            const recentMeasurements = recentBucket.measurements
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit);

            return recentMeasurements.map(measurement => ({
                timestamp: measurement.timestamp,
                measuringLogs: this.reverseTransformData(measurement.data)
            }));

        } catch (error) {
            console.error(`❌ Error getting recent history for ${stationKey}:`, error.message);
            return [];
        }
    }

    // ==================== ANALYTICS & RESEARCH FUNCTIONS ====================

    /**
     * Get aggregated statistics for research
     */
    async getStationStatistics(stationKey, startDate, endDate, parameters = []) {
        try {
            const pipeline = [
                {
                    $match: {
                        stationKey: stationKey,
                        bucketDate: {
                            $gte: new Date(startDate),
                            $lte: new Date(endDate)
                        }
                    }
                },
                { $unwind: '$measurements' },
                {
                    $match: {
                        'measurements.timestamp': {
                            $gte: new Date(startDate),
                            $lte: new Date(endDate)
                        }
                    }
                }
            ];

            // Add parameter-specific aggregation
            const statsGroup = {
                _id: null,
                count: { $sum: 1 },
                dateRange: {
                    $push: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$measurements.timestamp' } },
                        data: '$measurements.data'
                    }
                }
            };

            // Add parameter statistics
            parameters.forEach(param => {
                statsGroup[`${param}_avg`] = { $avg: `$measurements.data.${param}.value` };
                statsGroup[`${param}_min`] = { $min: `$measurements.data.${param}.value` };
                statsGroup[`${param}_max`] = { $max: `$measurements.data.${param}.value` };
            });

            pipeline.push({ $group: statsGroup });

            const result = await TimeseriesBucketV2.aggregate(pipeline);
            return result[0] || {};

        } catch (error) {
            console.error(`❌ Error getting statistics for ${stationKey}:`, error.message);
            throw error;
        }
    }

    /**
     * Get data export for research (CSV format)
     */
    async exportDataForResearch(stationKey, startDate, endDate, format = 'json') {
        try {
            const history = await this.getStationHistory(stationKey, startDate, endDate);

            if (format === 'csv') {
                return this.convertToCSV(history.history);
            }

            return history.history;

        } catch (error) {
            console.error(`❌ Error exporting data for ${stationKey}:`, error.message);
            throw error;
        }
    }

    // ==================== UTILITY FUNCTIONS ====================

    extractParameters(measuringLogs) {
        if (!measuringLogs) return [];

        return Object.values(measuringLogs).map(param => ({
            key: param.key,
            name: param.name,
            unit: param.unit,
            maxLimit: param.maxLimit,
            minLimit: param.minLimit,
            dataType: 'number'
        }));
    }

    transformMeasuringLogs(measuringLogs) {
        if (!measuringLogs) return {};

        const transformed = {};
        Object.entries(measuringLogs).forEach(([key, param]) => {
            transformed[key] = {
                value: param.value,
                unit: param.unit,
                warningLevel: param.warningLevel,
                statusDevice: param.statusDevice
            };
        });
        return transformed;
    }

    reverseTransformData(data) {
        if (!data) return {};

        const reversed = {};
        Object.entries(data).forEach(([key, value]) => {
            reversed[key] = {
                key: key,
                name: key, // You might want to get this from metadata
                value: value.value,
                unit: value.unit,
                warningLevel: value.warningLevel || 'GOOD',
                statusDevice: value.statusDevice || 0,
                maxLimit: null,
                minLimit: null
            };
        });
        return reversed;
    }

    convertToCSV(historyData) {
        if (!historyData || historyData.length === 0) return '';

        // Get all parameter keys
        const paramKeys = new Set();
        historyData.forEach(entry => {
            if (entry.measuringLogs) {
                Object.keys(entry.measuringLogs).forEach(key => paramKeys.add(key));
            }
        });

        // Create CSV headers
        const headers = ['timestamp', ...Array.from(paramKeys).map(key => `${key}_value`)];

        // Create CSV rows
        const rows = historyData.map(entry => {
            const row = [entry.timestamp];
            paramKeys.forEach(key => {
                const param = entry.measuringLogs?.[key];
                row.push(param ? param.value : '');
            });
            return row.join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    }

    /**
     * Lấy metadata của tất cả parameters - BACKWARD COMPATIBLE
     */
    async getParametersMetadata() {
        try {
            // Lấy từ station metadata V2
            const stations = await StationMetadataV2.find({ isActive: true });
            const metadata = {};

            stations.forEach(station => {
                if (station.parameters && Array.isArray(station.parameters)) {
                    station.parameters.forEach(param => {
                        if (!metadata[param.key]) {
                            metadata[param.key] = {
                                key: param.key,
                                name: param.name,
                                unit: param.unit,
                                maxLimit: param.maxLimit,
                                minLimit: param.minLimit,
                                dataType: param.dataType || 'number'
                            };
                        }
                    });
                }
            });

            return metadata;
        } catch (error) {
            console.error('❌ Error getting parameters metadata:', error.message);
            throw error;
        }
    }

    /**
     * Migration từ old schema sang new schema
     */
    async migrateFromOldSchema() {
        const BinhDuongModel = require('../models/binhDuongModel');

        try {
            console.log('📊 Bắt đầu migration từ old schema...');

            // 1. Lấy tất cả data từ old schema
            const oldStations = await BinhDuongModel.find({});
            console.log(`📋 Tìm thấy ${oldStations.length} stations trong old schema`);

            let migratedStations = 0;
            let migratedRecords = 0;

            for (const oldStation of oldStations) {
                // 2. Migrate station metadata
                await StationMetadataV2.findOneAndUpdate(
                    { key: oldStation.key },
                    {
                        key: oldStation.key,
                        name: oldStation.name,
                        address: oldStation.address,
                        mapLocation: oldStation.mapLocation,
                        province: oldStation.province,
                        stationType: oldStation.stationType,
                        parameters: this.extractParameters(oldStation.currentData?.measuringLogs),
                        updatedAt: new Date()
                    },
                    { upsert: true, new: true }
                );

                // 3. Migrate current data
                if (oldStation.currentData) {
                    await CurrentDataV2.findOneAndUpdate(
                        { stationKey: oldStation.key },
                        {
                            stationKey: oldStation.key,
                            receivedAt: oldStation.currentData.receivedAt,
                            data: this.transformMeasuringLogs(oldStation.currentData.measuringLogs),
                            rawData: oldStation.currentData.measuringLogs,
                            updatedAt: new Date()
                        },
                        { upsert: true, new: true }
                    );
                }

                // 4. Migrate history to buckets
                if (oldStation.history && oldStation.history.length > 0) {
                    const buckets = new Map();

                    // Group history by date
                    oldStation.history.forEach(entry => {
                        const date = new Date(entry.timestamp);
                        const bucketDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                        const bucketKey = bucketDate.toISOString();

                        if (!buckets.has(bucketKey)) {
                            buckets.set(bucketKey, {
                                stationKey: oldStation.key,
                                bucketDate: bucketDate,
                                measurements: [],
                                count: 0
                            });
                        }

                        buckets.get(bucketKey).measurements.push({
                            timestamp: entry.timestamp,
                            data: this.transformMeasuringLogs(entry.measuringLogs),
                            quality: 'migrated'
                        });
                        buckets.get(bucketKey).count++;
                    });

                    // Save buckets
                    for (const bucketData of buckets.values()) {
                        await TimeseriesBucketV2.findOneAndUpdate(
                            {
                                stationKey: bucketData.stationKey,
                                bucketDate: bucketData.bucketDate
                            },
                            bucketData,
                            { upsert: true, new: true }
                        );
                        migratedRecords += bucketData.count;
                    }
                }

                migratedStations++;
                console.log(`✅ Migrated station ${oldStation.key} (${migratedStations}/${oldStations.length})`);
            }

            const result = {
                success: true,
                migratedStations,
                migratedRecords,
                timestamp: new Date().toISOString()
            };

            console.log('🎉 Migration hoàn thành:', result);
            return result;

        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            throw error;
        }
    }
}

module.exports = BinhDuongServiceV2;