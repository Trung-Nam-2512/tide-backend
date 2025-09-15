/**
 * Forecast Data Controller - Refactored to follow SOLID principles
 * Single Responsibility: Only handles HTTP request/response logic
 */

const ResponseFormatter = require('../utils/ResponseFormatter');
const StatisticsProcessor = require('../utils/StatisticsProcessor');
const forecastHoDauTiengService = require('../services/forecastHoDauTiengService');
const { testForecastScheduler } = require('../scheduler/forecastHoDauTiengScheduler');

class ForecastDataController {
    constructor() {
        this.responseFormatter = new ResponseFormatter();   
        this.statsProcessor = new StatisticsProcessor();
        this.forecastService = forecastHoDauTiengService;
    }

    /**
     * Fetch forecast data for parameter(s)
     * GET /api/forecast-data/fetch/:parameter?
     */
    fetchData = async (req, res) => {
        try {
            const { parameter } = req.params;
            
            console.log(`🔄 Manual fetch request for parameter: ${parameter || 'ALL'}`);
            
            const result = parameter 
                ? await this.forecastService.fetchAndStoreForecastData(parameter)
                : await this.forecastService.fetchAllForecastData();
            
            if (result.success || (result.successful && result.successful > 0)) {
                return this.responseFormatter.success(res, {
                    message: parameter 
                        ? `Forecast data fetched for ${parameter}` 
                        : 'Forecast data fetched for all parameters',
                    data: result
                });
            }

            return this.responseFormatter.error(res, {
                message: result.message || 'Failed to fetch forecast data',
                error: result.errors || [result.message]
            }, 500);
            
        } catch (error) {
            console.error('❌ Forecast fetch error:', error.message);
            return this.responseFormatter.serverError(res, error);
        }
    }

    /**
     * Get latest data
     * GET /api/forecast-data/latest/:parameter?
     */
    getLatest = async (req, res) => {
        try {
            const parameter = (req.params.parameter || 'MUCNUOCHO').toUpperCase();
            const { dataSource } = req.query;
            
            const result = await this.forecastService.getLatestData(parameter, dataSource);
            
            if (result.success) {
                return this.responseFormatter.success(res, {
                    message: result.data ? 'Latest data found' : 'No data found',
                    data: result.data,
                    metadata: {
                        parameter,
                        dataSource: dataSource || 'all'
                    }
                });
            }

            return this.responseFormatter.error(res, {
                message: 'Failed to get latest data',
                error: result.error
            }, 500);
            
        } catch (error) {
            console.error('❌ Get latest data error:', error.message);
            return this.responseFormatter.serverError(res, error);
        }
    }

    /**
     * Get data in date range
     * GET /api/forecast-data/range/:parameter
     */
    getRange = async (req, res) => {
        try {
            const { parameter } = req.params;
            const { startDate, endDate, dataSource } = req.query;
            
            const result = await this.forecastService.getDataInRange(
                parameter, 
                startDate, 
                endDate, 
                dataSource
            );
            
            if (result.success) {
                return this.responseFormatter.success(res, {
                    message: `Found ${result.count} records`,
                    data: result.data,
                    metadata: {
                        count: result.count,
                        parameter,
                        dateRange: { startDate, endDate },
                        dataSource: dataSource || 'all'
                    }
                });
            }

            return this.responseFormatter.error(res, {
                message: 'Failed to get data in range',
                error: result.error
            }, 500);
            
        } catch (error) {
            console.error('❌ Get data in range error:', error.message);
            return this.responseFormatter.serverError(res, error);
        }
    }

    /**
     * Get statistics
     * GET /api/forecast-data/statistics
     */
    getStatistics = async (req, res) => {
        try {
            const result = await this.forecastService.getDataStatistics();
            
            if (result.success) {
                const processedStats = this.statsProcessor.process(result.statistics);
                
                return this.responseFormatter.success(res, {
                    message: 'Statistics retrieved successfully',
                    data: {
                        statistics: processedStats.formatted,
                        raw_statistics: result.statistics,
                        summary: processedStats.summary
                    }
                });
            }

            return this.responseFormatter.error(res, {
                message: 'Failed to get statistics',
                error: result.error
            }, 500);
            
        } catch (error) {
            console.error('❌ Get statistics error:', error.message);
            return this.responseFormatter.serverError(res, error);
        }
    }

    /**
     * Test scheduler
     * GET /api/forecast-data/test-scheduler
     */
    testScheduler = async (req, res) => {
        try {
            console.log('🧪 Manual scheduler test triggered');
            
            const result = await testForecastScheduler();
            
            return this.responseFormatter.success(res, {
                message: 'Scheduler test completed',
                data: result
            });
            
        } catch (error) {
            console.error('❌ Scheduler test error:', error.message);
            return this.responseFormatter.error(res, {
                message: 'Scheduler test failed',
                error: error.message
            }, 500);
        }
    }

    /**
     * Health check
     * GET /api/forecast-data/health
     */
    healthCheck = async (req, res) => {
        try {
            // Check latest data for both parameters
            const mucnuochoResult = await this.forecastService.getLatestData('MUCNUOCHO');
            const qdenResult = await this.forecastService.getLatestData('QDEN');
            
            // Check statistics
            const statsResult = await this.forecastService.getDataStatistics();
            
            const health = {
                status: 'healthy',
                service: 'forecast-hodautieng',
                timestamp: new Date().toISOString(),
                data_availability: {
                    mucnuocho: {
                        available: mucnuochoResult.success && mucnuochoResult.data,
                        latest_timestamp: mucnuochoResult.data?.timestamp || null
                    },
                    qden: {
                        available: qdenResult.success && qdenResult.data,
                        latest_timestamp: qdenResult.data?.timestamp || null
                    }
                },
                statistics: {
                    available: statsResult.success,
                    total_categories: statsResult.statistics?.length || 0
                }
            };
            
            // Determine overall health status
            const hasRecentData = (mucnuochoResult.data || qdenResult.data);
            if (!hasRecentData) {
                health.status = 'warning';
                health.warning = 'No recent data available';
            }
            
            return this.responseFormatter.success(res, {
                message: `Service is ${health.status}`,
                data: health
            });
            
        } catch (error) {
            console.error('❌ Health check error:', error.message);
            return this.responseFormatter.error(res, {
                message: 'Health check failed',
                error: error.message
            }, 500);
        }
    }

    /**
     * API Information
     * GET /api/forecast-data/
     */
    getApiInfo = (req, res) => {
        const apiInfo = {
            service: 'Forecast Data API',
            description: 'API dự báo mực nước Hồ Dầu Tiếng với dữ liệu thực tế + dự báo 3 ngày',
            version: '1.0.0',
            endpoints: {
                'GET /fetch/:parameter?': 'Fetch dữ liệu dự báo (MUCNUOCHO/QDEN)',
                'GET /latest/:parameter?': 'Lấy dữ liệu mới nhất',
                'GET /range/:parameter': 'Lấy dữ liệu trong khoảng thời gian',
                'GET /statistics': 'Thống kê dữ liệu',
                'GET /test-scheduler': 'Test scheduler manually',
                'GET /health': 'Health check'
            },
            data_sources: {
                api_url: 'https://hodautieng.vn/jaxrs/QuanTracHoChua/getDataQuanTracMobile',
                station_uuid: '613bbcf5-212e-43c5-9ef8-69016787454f',
                parameters: ['MUCNUOCHO', 'QDEN'],
                schedule: 'Mỗi 1 giờ + Initial fetch khi start server'
            }
        };

        return this.responseFormatter.success(res, {
            message: 'API Information',
            data: apiInfo
        });
    }

    /**
     * Handle 404 for unknown endpoints
     */
    notFound = (req, res) => {
        return this.responseFormatter.notFound(res, 'Forecast Data API endpoint not found');
    }
}

module.exports = ForecastDataController;