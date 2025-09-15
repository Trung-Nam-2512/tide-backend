/**
 * Forecast Data Statistics Service - Business logic cho thống kê dữ liệu
 */

const forecastDataRepository = require('../repositories/forecastDataRepository');

class ForecastDataStatisticsService {
    constructor() {
        this.repository = forecastDataRepository;
    }

    /**
     * Thống kê tổng quan theo trạm và parameter
     */
    async getBasicStatistics(hcUuid, parameterType, startDate, endDate) {
        try {
            const ForecastData = this.repository.model;
            
            const pipeline = [
                {
                    $match: {
                        hc_uuid: hcUuid,
                        parameter_type: parameterType,
                        timestamp: {
                            $gte: new Date(startDate),
                            $lte: new Date(endDate)
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        minValue: { $min: '$value' },
                        maxValue: { $max: '$value' },
                        avgValue: { $avg: '$value' },
                        realtimeCount: {
                            $sum: {
                                $cond: [{ $eq: ['$data_source', 'realtime'] }, 1, 0]
                            }
                        },
                        forecastCount: {
                            $sum: {
                                $cond: [{ $eq: ['$data_source', 'forecast'] }, 1, 0]
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalRecords: '$count',
                        minValue: { $round: ['$minValue', 3] },
                        maxValue: { $round: ['$maxValue', 3] },
                        avgValue: { $round: ['$avgValue', 3] },
                        realtimeRecords: '$realtimeCount',
                        forecastRecords: '$forecastCount',
                        dataCompleteness: {
                            $round: [{
                                $multiply: [
                                    { $divide: ['$realtimeCount', '$count'] },
                                    100
                                ]
                            }, 2]
                        }
                    }
                }
            ];

            const results = await ForecastData.aggregate(pipeline);
            return results[0] || null;

        } catch (error) {
            throw new Error(`Error getting statistics: ${error.message}`);
        }
    }

    /**
     * Thống kê theo data source
     */
    async getDataSourceStatistics(hcUuid) {
        try {
            const ForecastData = this.repository.model;
            
            const pipeline = [
                {
                    $match: { hc_uuid: hcUuid }
                },
                {
                    $group: {
                        _id: {
                            parameter_type: '$parameter_type',
                            data_source: '$data_source'
                        },
                        count: { $sum: 1 },
                        latest_timestamp: { $max: '$timestamp' },
                        earliest_timestamp: { $min: '$timestamp' },
                        avgValue: { $avg: '$value' }
                    }
                },
                {
                    $sort: {
                        '_id.parameter_type': 1,
                        '_id.data_source': 1
                    }
                }
            ];

            return await ForecastData.aggregate(pipeline);

        } catch (error) {
            throw new Error(`Error getting data source statistics: ${error.message}`);
        }
    }

    /**
     * Tìm outliers dựa trên statistical analysis
     */
    async findOutliers(hcUuid, parameterType, threshold = 3) {
        try {
            const data = await this.repository.findByStationAndTime(
                hcUuid,
                parameterType,
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days back
                new Date(),
                'realtime'
            );

            if (data.length === 0) {
                return [];
            }

            // Calculate mean and standard deviation
            const values = data.map(d => d.value);
            const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
            const stdDev = Math.sqrt(variance);

            // Find outliers
            const outliers = data.filter(item => {
                const deviation = Math.abs(item.value - mean) / stdDev;
                return deviation > threshold;
            });

            return outliers.map(outlier => ({
                ...outlier,
                deviation: Math.abs(outlier.value - mean) / stdDev,
                mean,
                stdDev
            }));

        } catch (error) {
            throw new Error(`Error finding outliers: ${error.message}`);
        }
    }

    /**
     * Thống kê dữ liệu theo khoảng thời gian (hourly, daily, monthly)
     */
    async getTimeSeriesStatistics(hcUuid, parameterType, startDate, endDate, interval = 'daily') {
        try {
            const ForecastData = this.repository.model;
            
            let groupBy;
            switch (interval) {
                case 'hourly':
                    groupBy = {
                        year: { $year: '$timestamp' },
                        month: { $month: '$timestamp' },
                        day: { $dayOfMonth: '$timestamp' },
                        hour: { $hour: '$timestamp' }
                    };
                    break;
                case 'daily':
                    groupBy = {
                        year: { $year: '$timestamp' },
                        month: { $month: '$timestamp' },
                        day: { $dayOfMonth: '$timestamp' }
                    };
                    break;
                case 'monthly':
                    groupBy = {
                        year: { $year: '$timestamp' },
                        month: { $month: '$timestamp' }
                    };
                    break;
                default:
                    throw new Error('Invalid interval. Use: hourly, daily, or monthly');
            }

            const pipeline = [
                {
                    $match: {
                        hc_uuid: hcUuid,
                        parameter_type: parameterType,
                        timestamp: {
                            $gte: new Date(startDate),
                            $lte: new Date(endDate)
                        }
                    }
                },
                {
                    $group: {
                        _id: groupBy,
                        count: { $sum: 1 },
                        minValue: { $min: '$value' },
                        maxValue: { $max: '$value' },
                        avgValue: { $avg: '$value' },
                        firstTimestamp: { $min: '$timestamp' },
                        lastTimestamp: { $max: '$timestamp' }
                    }
                },
                {
                    $sort: {
                        '_id.year': 1,
                        '_id.month': 1,
                        '_id.day': 1,
                        '_id.hour': 1
                    }
                }
            ];

            return await ForecastData.aggregate(pipeline);

        } catch (error) {
            throw new Error(`Error getting time series statistics: ${error.message}`);
        }
    }
}

module.exports = new ForecastDataStatisticsService();