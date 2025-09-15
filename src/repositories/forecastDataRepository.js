/**
 * Forecast Data Repository - Data access layer tuân thủ SOLID principles
 */

const ForecastData = require('../models/ForecastData');

class ForecastDataRepository {
    constructor() {
        this.model = ForecastData;
    }

    /**
     * Tạo hoặc cập nhật dữ liệu (upsert)
     */
    async upsert(data) {
        const query = {
            hc_uuid: data.hc_uuid,
            parameter_type: data.parameter_type,
            timestamp: data.timestamp,
            data_source: data.data_source
        };

        return await this.model.findOneAndUpdate(
            query,
            data,
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );
    }

    /**
     * Lưu nhiều records với batch upsert
     */
    async upsertMany(dataArray) {
        const operations = dataArray.map(data => ({
            updateOne: {
                filter: {
                    hc_uuid: data.hc_uuid,
                    parameter_type: data.parameter_type,
                    timestamp: data.timestamp,
                    data_source: data.data_source
                },
                update: data,
                upsert: true
            }
        }));

        return await this.model.bulkWrite(operations);
    }

    /**
     * Tìm dữ liệu theo trạm và thời gian
     */
    async findByStationAndTime(hcUuid, parameterType, startDate, endDate, dataSource = null) {
        const query = {
            hc_uuid: hcUuid,
            parameter_type: parameterType,
            timestamp: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        if (dataSource) {
            query.data_source = dataSource;
        }

        return await this.model.find(query).sort({ timestamp: 1 }).lean();
    }

    /**
     * Lấy dữ liệu mới nhất
     */
    async getLatest(hcUuid, parameterType, dataSource = null) {
        const query = {
            hc_uuid: hcUuid,
            parameter_type: parameterType
        };

        if (dataSource) {
            query.data_source = dataSource;
        }

        return await this.model.findOne(query)
            .sort({ timestamp: -1 })
            .lean();
    }

    /**
     * Lấy dữ liệu realtime trong X giờ gần nhất
     */
    async getRecentRealtime(hcUuid, parameterType, hoursBack = 24) {
        const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
        
        return await this.model.find({
            hc_uuid: hcUuid,
            parameter_type: parameterType,
            data_source: 'realtime',
            timestamp: { $gte: startTime }
        }).sort({ timestamp: -1 }).lean();
    }

    /**
     * Lấy dữ liệu forecast trong X giờ tới
     */
    async getForecastData(hcUuid, parameterType, hoursAhead = 72) {
        const endTime = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
        
        return await this.model.find({
            hc_uuid: hcUuid,
            parameter_type: parameterType,
            data_source: 'forecast',
            timestamp: { $lte: endTime }
        }).sort({ timestamp: 1 }).lean();
    }

    /**
     * Xóa dữ liệu cũ
     */
    async deleteOldData(daysToKeep = 365, excludeDataSources = ['forecast']) {
        const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
        
        const query = {
            timestamp: { $lt: cutoffDate }
        };

        if (excludeDataSources.length > 0) {
            query.data_source = { $nin: excludeDataSources };
        }

        return await this.model.deleteMany(query);
    }

    /**
     * Đếm số lượng records
     */
    async count(query = {}) {
        return await this.model.countDocuments(query);
    }

    /**
     * Tìm theo ID
     */
    async findById(id) {
        return await this.model.findById(id).lean();
    }

    /**
     * Xóa theo query
     */
    async deleteMany(query) {
        return await this.model.deleteMany(query);
    }
}

module.exports = new ForecastDataRepository();