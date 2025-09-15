/**
 * Forecast Hồ Dầu Tiếng Service - Service lấy dữ liệu dự báo mực nước từ API thực tế
 */

const axios = require('axios');
const forecastDataRepository = require('../repositories/forecastDataRepository');

class ForecastHoDauTiengService {
    constructor() {
        this.apiUrl = process.env.API_URL_FORECAST_HODAUTIENG;
        this.stationUuid = process.env.STATIONUUID_FORECAST_HDT;
        this.timeout = 30000;
        this.retryAttempts = 3;
    }

    /**
     * Tạo payload cho API dự báo mực nước
     */
    createForecastPayload(parameterType = 'MUCNUOCHO') {
        // Lấy thời gian hiện tại theo múi giờ +7
        const now = new Date();
        const vietnamTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));

        // Format thời gian cho API (không padding số 0)
        const formatDateTime = (date) => {
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const seconds = date.getSeconds();
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        };

        // Thời gian thực đo: 24 giờ trước đến hiện tại
        const startDateTime = new Date(vietnamTime);
        startDateTime.setDate(startDateTime.getDate() - 1);
        const tungay = formatDateTime(startDateTime);
        const denngay = formatDateTime(vietnamTime);

        // Thời gian dự báo: từ hiện tại đến 3 ngày sau  
        const tungaydb = formatDateTime(vietnamTime);
        const endDateTime = new Date(vietnamTime);
        endDateTime.setDate(endDateTime.getDate() + 3);
        const denngaydb = formatDateTime(endDateTime);

        // Map parameter names
        const parameterNames = {
            'MUCNUOCHO': 'Mực nước hồ',
            'QDEN': 'Dòng chảy đến hồ'
        };

        const payload = {
            data: {
                hc_uuid: this.stationUuid,
                tents: parameterNames[parameterType] || 'Mực nước hồ',
                mats: parameterType,
                tungay: tungay,        // Bắt đầu dữ liệu thực đo
                denngay: denngay,      // Kết thúc dữ liệu thực đo (hiện tại)
                tungaydb: tungaydb,    // Bắt đầu dữ liệu dự báo (hiện tại)
                denngaydb: denngaydb,  // Kết thúc dữ liệu dự báo (3 ngày sau)
                tansuat: 60,           // Tần suất 60 phút
                nguondb: "2",
                mact: this.stationUuid,
                kichban: "0"
            },
            token: ""
        };

        console.log(`📊 Forecast payload for ${parameterType}:`);
        console.log(`   Realtime: ${tungay} → ${denngay}`);
        console.log(`   Forecast: ${tungaydb} → ${denngaydb}`);

        return payload;
    }

    /**
     * Gọi API với retry logic
     */
    async callAPIWithRetry(payload, maxRetries = 3) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 API call attempt ${attempt}/${maxRetries} for ${payload.data.mats}`);

                const response = await axios.post(this.apiUrl, payload, {
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Hydrology-Dashboard-Forecast/1.0'
                    }
                });

                if (response.status === 200 && response.data) {
                    console.log(`✅ API call successful for ${payload.data.mats} on attempt ${attempt}`);
                    // Debug: Log sample structure for QDEN issues
                    if (payload.data.mats === 'QDEN' && response.data.dtDataDuBao && response.data.dtDataDuBao.length > 0) {
                        console.log('🔍 Sample QDEN forecast data:', JSON.stringify(response.data.dtDataDuBao[0], null, 2));
                        console.log('🔍 Available keys in first item:', Object.keys(response.data.dtDataDuBao[0]));
                    }
                    return response.data;
                }

            } catch (error) {
                lastError = error;
                const errorMsg = error.response?.data?.message || error.message;
                console.warn(`⚠️ API attempt ${attempt} failed for ${payload.data.mats}: ${errorMsg}`);

                // Không retry cho 4xx errors
                if (error.response && error.response.status >= 400 && error.response.status < 500) {
                    console.error(`❌ Client error ${error.response.status}, stopping retries`);
                    break;
                }

                // Exponential backoff delay
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`⏳ Waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(`API call failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
    }

    /**
     * Xử lý và parse dữ liệu từ API response
     */
    parseAPIResponse(apiResponse, parameterType) {
        if (!apiResponse || (!apiResponse.dtDataQuanTrac && !apiResponse.dtDataDuBao)) {
            throw new Error('Invalid API response format');
        }

        const processedData = [];
        const now = new Date();

        // Xử lý dữ liệu thực đo (realtime)
        const realtimeData = apiResponse.dtDataQuanTrac || [];
        for (const item of realtimeData) {
            try {
                // Parse timestamp từ response
                let timestamp;
                const timeField = item.data_thoigian || item.timestamp || item.time || item.thoigian || item.ngay;

                if (!timeField) {
                    console.warn('⚠️ Missing timestamp in data item:', item);
                    continue;
                }

                // Thử parse timestamp với nhiều format
                if (typeof timeField === 'string') {
                    timestamp = new Date(timeField);
                } else {
                    timestamp = new Date(timeField);
                }

                if (isNaN(timestamp.getTime())) {
                    console.warn('⚠️ Invalid timestamp:', timeField);
                    continue;
                }

                // Parse value dựa trên parameter type
                let valueField;
                if (parameterType === 'MUCNUOCHO') {
                    valueField = item.mucnuocho || item.value || item.giatri || item.val || item.data;
                } else if (parameterType === 'QDEN') {
                    valueField = item.qden || item.qvao || item.value || item.giatri || item.val || item.data;
                } else {
                    valueField = item.value || item.giatri || item.val || item.data;
                }
                const value = parseFloat(valueField);

                if (isNaN(value)) {
                    console.warn('⚠️ Invalid value:', valueField);
                    console.warn('⚠️ Raw item structure:', JSON.stringify(item, null, 2));
                    console.warn('⚠️ Available keys:', Object.keys(item));
                    continue;
                }

                // Realtime data luôn là realtime
                processedData.push({
                    hc_uuid: this.stationUuid,
                    parameter_type: parameterType,
                    timestamp: timestamp,
                    value: value,
                    data_source: 'realtime',
                    forecast_horizon: 0,
                    raw_data: item
                });

            } catch (parseError) {
                console.warn('⚠️ Error parsing realtime data item:', parseError.message, item);
                continue;
            }
        }

        // Xử lý dữ liệu dự báo (forecast)
        const forecastData = apiResponse.dtDataDuBao || [];
        for (const item of forecastData) {
            try {
                // Parse timestamp từ response
                let timestamp;
                const timeField = item.data_thoigian || item.timestamp || item.time || item.thoigian || item.ngay;

                if (!timeField) {
                    console.warn('⚠️ Missing timestamp in forecast data item:', item);
                    continue;
                }

                // Thử parse timestamp với nhiều format
                if (typeof timeField === 'string') {
                    timestamp = new Date(timeField);
                } else {
                    timestamp = new Date(timeField);
                }

                if (isNaN(timestamp.getTime())) {
                    console.warn('⚠️ Invalid forecast timestamp:', timeField);
                    continue;
                }

                // Parse value dựa trên parameter type
                let valueField;
                if (parameterType === 'MUCNUOCHO') {
                    valueField = item.mucnuocho || item.value || item.giatri || item.val || item.data;
                } else if (parameterType === 'QDEN') {
                    valueField = item.qden || item.qvao || item.value || item.giatri || item.val || item.data;
                } else {
                    valueField = item.value || item.giatri || item.val || item.data;
                }
                const value = parseFloat(valueField);

                if (isNaN(value)) {
                    console.warn('⚠️ Invalid forecast value:', valueField);
                    console.warn('⚠️ Raw item structure:', JSON.stringify(item, null, 2));
                    console.warn('⚠️ Available keys:', Object.keys(item));
                    continue;
                }

                // Forecast data luôn là forecast
                const forecastHorizon = Math.round((timestamp.getTime() - now.getTime()) / (1000 * 60 * 60));

                processedData.push({
                    hc_uuid: this.stationUuid,
                    parameter_type: parameterType,
                    timestamp: timestamp,
                    value: value,
                    data_source: 'forecast',
                    forecast_horizon: Math.max(0, forecastHorizon),
                    raw_data: item
                });

            } catch (parseError) {
                console.warn('⚠️ Error parsing forecast data item:', parseError.message, item);
                continue;
            }
        }

        return processedData;
    }

    /**
     * Lưu dữ liệu vào database với upsert
     */
    async saveToDatabase(processedData) {
        if (!processedData || processedData.length === 0) {
            return { inserted: 0, updated: 0, errors: 0 };
        }

        let inserted = 0;
        let updated = 0;
        let errors = 0;

        try {
            const result = await forecastDataRepository.upsertMany(processedData);
            
            return {
                inserted: result.upsertedCount || 0,
                updated: result.modifiedCount || 0,
                errors: 0
            };
        } catch (saveError) {
            console.error('❌ Error saving data to database:', saveError.message);
            return {
                inserted: 0,
                updated: 0,
                errors: processedData.length
            };
        }

        return { inserted, updated, errors };
    }

    /**
     * Fetch và lưu dữ liệu dự báo cho một parameter
     */
    async fetchAndStoreForecastData(parameterType = 'MUCNUOCHO') {
        try {
            console.log(`🔄 Fetching forecast data for ${parameterType}...`);

            // Tạo payload
            const payload = this.createForecastPayload(parameterType);

            // Gọi API
            const apiResponse = await this.callAPIWithRetry(payload);

            // Parse data
            const processedData = this.parseAPIResponse(apiResponse, parameterType);

            if (processedData.length === 0) {
                console.warn(`⚠️ No valid data found for ${parameterType}`);
                return {
                    success: false,
                    message: 'No valid data found',
                    stats: { inserted: 0, updated: 0, errors: 0 }
                };
            }

            // Lưu vào database
            const saveStats = await this.saveToDatabase(processedData);

            console.log(`✅ Forecast data processed for ${parameterType}:`);
            console.log(`   📊 Total processed: ${processedData.length}`);
            console.log(`   📈 Inserted: ${saveStats.inserted}`);
            console.log(`   🔄 Updated: ${saveStats.updated}`);
            console.log(`   ❌ Errors: ${saveStats.errors}`);

            // Phân tích dữ liệu
            const realtimeCount = processedData.filter(d => d.data_source === 'realtime').length;
            const forecastCount = processedData.filter(d => d.data_source === 'forecast').length;

            console.log(`   🕐 Realtime records: ${realtimeCount}`);
            console.log(`   🔮 Forecast records: ${forecastCount}`);

            return {
                success: true,
                message: `Successfully processed ${processedData.length} records`,
                stats: saveStats,
                dataBreakdown: {
                    total: processedData.length,
                    realtime: realtimeCount,
                    forecast: forecastCount
                }
            };

        } catch (error) {
            console.error(`❌ Error in fetchAndStoreForecastData for ${parameterType}:`, error.message);
            return {
                success: false,
                message: error.message,
                stats: { inserted: 0, updated: 0, errors: 1 }
            };
        }
    }

    /**
     * Fetch tất cả parameters (MUCNUOCHO + QDEN)
     */
    async fetchAllForecastData() {
        console.log('🚀 Starting forecast data fetch for all parameters...');

        const parameters = ['MUCNUOCHO', 'QDEN'];
        const results = {
            total_parameters: parameters.length,
            successful: 0,
            failed: 0,
            total_records: 0,
            parameter_results: {},
            errors: []
        };

        for (const parameterType of parameters) {
            try {
                const result = await this.fetchAndStoreForecastData(parameterType);

                results.parameter_results[parameterType] = result;

                if (result.success) {
                    results.successful++;
                    results.total_records += (result.stats.inserted + result.stats.updated);
                } else {
                    results.failed++;
                    results.errors.push(`${parameterType}: ${result.message}`);
                }

                // Delay giữa các calls để tránh rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                results.failed++;
                results.errors.push(`${parameterType}: ${error.message}`);
                console.error(`❌ Error processing ${parameterType}:`, error.message);
            }
        }

        console.log(`✅ Forecast data fetch completed:`);
        console.log(`   📊 Parameters: ${results.successful}/${results.total_parameters} successful`);
        console.log(`   📈 Total records: ${results.total_records}`);
        if (results.errors.length > 0) {
            console.log(`   ❌ Errors: ${results.errors.length}`);
            results.errors.forEach(error => console.log(`      - ${error}`));
        }

        return results;
    }

    /**
     * Lấy dữ liệu mới nhất từ database
     */
    async getLatestData(parameterType = 'MUCNUOCHO', dataSource = null) {
        try {
            const query = {
                hc_uuid: this.stationUuid,
                parameter_type: parameterType
            };

            if (dataSource) {
                query.data_source = dataSource;
            }

            const latestData = await forecastDataRepository.getLatest(
                this.stationUuid,
                parameterType,
                dataSource
            );

            return {
                success: true,
                data: latestData
            };

        } catch (error) {
            console.error('❌ Error getting latest data:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Lấy dữ liệu trong khoảng thời gian
     */
    async getDataInRange(parameterType, startDate, endDate, dataSource = null) {
        try {
            const query = {
                hc_uuid: this.stationUuid,
                parameter_type: parameterType,
                timestamp: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };

            if (dataSource) {
                query.data_source = dataSource;
            }

            const data = await forecastDataRepository.findByStationAndTime(
                this.stationUuid,
                parameterType,
                startDate,
                endDate,
                dataSource
            );

            return {
                success: true,
                data: data,
                count: data.length
            };

        } catch (error) {
            console.error('❌ Error getting data in range:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Thống kê dữ liệu
     */
    async getDataStatistics() {
        try {
            // Use repository for statistics
            const totalCount = await forecastDataRepository.count({ hc_uuid: this.stationUuid });
            const realtimeCount = await forecastDataRepository.count({ 
                hc_uuid: this.stationUuid, 
                data_source: 'realtime' 
            });
            const forecastCount = await forecastDataRepository.count({ 
                hc_uuid: this.stationUuid, 
                data_source: 'forecast' 
            });
            
            const stats = {
                total: totalCount,
                realtime: realtimeCount,
                forecast: forecastCount
            };

            return {
                success: true,
                statistics: stats
            };

        } catch (error) {
            console.error('❌ Error getting statistics:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new ForecastHoDauTiengService();