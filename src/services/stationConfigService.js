/**
 * Station Config Service - Quản lý cấu hình API và parameters cho stations
 */

class StationConfigService {
    constructor() {
        // Default configurations cho các loại stations
        this.defaultConfigs = {
            HODAUTIENG: {
                apiUrl: process.env.API_URL_FORECAST_HODAUTIENG || 'https://hodautieng.vn/jaxrs/QuanTracHoChua/getDataQuanTracMobile',
                timeout: 30000,
                retryAttempts: 3,
                fetchInterval: 3600, // seconds
                forecastDays: 3,
                realtimeLookback: 24, // hours
                delayBetweenCalls: 2000
            },
            DEFAULT: {
                apiUrl: null,
                timeout: 30000,
                retryAttempts: 3,
                fetchInterval: 3600,
                forecastDays: 3,
                realtimeLookback: 24,
                delayBetweenCalls: 2000
            }
        };

        // Supported parameters configuration
        this.supportedParameters = {
            MUCNUOCHO: {
                name: 'Mực nước hồ',
                unit: 'm',
                minValue: -10,
                maxValue: 50,
                decimalPlaces: 2,
                fieldMappings: ['mucnuocho', 'value', 'giatri', 'val', 'data']
            },
            QDEN: {
                name: 'Dòng chảy đến hồ',
                unit: 'm³/s',
                minValue: 0,
                maxValue: 10000,
                decimalPlaces: 2,
                fieldMappings: ['qden', 'qvao', 'value', 'giatri', 'val', 'data']
            },
            QXA: {
                name: 'Dòng chảy xả',
                unit: 'm³/s',
                minValue: 0,
                maxValue: 5000,
                decimalPlaces: 2,
                fieldMappings: ['qxa', 'value', 'giatri', 'val', 'data']
            },
            RAINFALL: {
                name: 'Lượng mưa',
                unit: 'mm',
                minValue: 0,
                maxValue: 1000,
                decimalPlaces: 1,
                fieldMappings: ['rainfall', 'luongmua', 'value', 'giatri', 'val', 'data']
            }
        };
    }

    /**
     * Lấy config cho một station dựa trên type
     */
    getStationConfig(stationType = 'DEFAULT') {
        return this.defaultConfigs[stationType] || this.defaultConfigs.DEFAULT;
    }

    /**
     * Lấy config cho Hồ Dầu Tiếng station
     */
    getHoDauTiengConfig() {
        return this.getStationConfig('HODAUTIENG');
    }

    /**
     * Tạo custom config cho station
     */
    createCustomConfig(baseType, customSettings = {}) {
        const baseConfig = this.getStationConfig(baseType);
        return {
            ...baseConfig,
            ...customSettings
        };
    }

    /**
     * Validate config settings
     */
    validateConfig(config) {
        const errors = [];

        if (config.timeout && (config.timeout < 5000 || config.timeout > 120000)) {
            errors.push('Timeout must be between 5000ms and 120000ms');
        }

        if (config.retryAttempts && (config.retryAttempts < 1 || config.retryAttempts > 10)) {
            errors.push('Retry attempts must be between 1 and 10');
        }

        if (config.fetchInterval && config.fetchInterval < 300) {
            errors.push('Fetch interval must be at least 300 seconds');
        }

        if (config.forecastDays && (config.forecastDays < 1 || config.forecastDays > 30)) {
            errors.push('Forecast days must be between 1 and 30');
        }

        if (config.realtimeLookback && (config.realtimeLookback < 1 || config.realtimeLookback > 168)) {
            errors.push('Realtime lookback must be between 1 and 168 hours');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Lấy thông tin parameter
     */
    getParameterInfo(parameterCode) {
        return this.supportedParameters[parameterCode] || null;
    }

    /**
     * Lấy tất cả parameters được hỗ trợ
     */
    getAllSupportedParameters() {
        return Object.keys(this.supportedParameters).map(code => ({
            code,
            ...this.supportedParameters[code]
        }));
    }

    /**
     * Kiểm tra parameter có được hỗ trợ không
     */
    isParameterSupported(parameterCode) {
        return parameterCode in this.supportedParameters;
    }

    /**
     * Lấy field mappings cho parameter
     */
    getParameterFieldMappings(parameterCode) {
        const param = this.getParameterInfo(parameterCode);
        return param ? param.fieldMappings : ['value', 'giatri', 'val', 'data'];
    }

    /**
     * Lấy validation rules cho parameter
     */
    getParameterValidationRules(parameterCode) {
        const param = this.getParameterInfo(parameterCode);
        if (!param) return null;

        return {
            min: param.minValue,
            max: param.maxValue,
            decimalPlaces: param.decimalPlaces,
            unit: param.unit
        };
    }

    /**
     * Tạo config cho API payload
     */
    createApiPayloadConfig(stationType, parameterCode) {
        const stationConfig = this.getStationConfig(stationType);
        const parameterInfo = this.getParameterInfo(parameterCode);

        if (!parameterInfo) {
            throw new Error(`Unsupported parameter: ${parameterCode}`);
        }

        return {
            apiUrl: stationConfig.apiUrl,
            timeout: stationConfig.timeout,
            retryAttempts: stationConfig.retryAttempts,
            parameter: {
                code: parameterCode,
                name: parameterInfo.name,
                unit: parameterInfo.unit,
                fieldMappings: parameterInfo.fieldMappings
            },
            timeSettings: {
                forecastDays: stationConfig.forecastDays,
                realtimeLookback: stationConfig.realtimeLookback,
                frequency: 60 // minutes
            }
        };
    }

    /**
     * Lấy config cho batch processing
     */
    getBatchProcessingConfig() {
        return {
            maxConcurrentRequests: 3,
            delayBetweenRequests: 2000,
            chunkSize: 10,
            maxRetries: 3,
            timeoutPerRequest: 30000
        };
    }

    /**
     * Update config runtime (cho testing/development)
     */
    updateRuntimeConfig(stationType, newConfig) {
        if (this.defaultConfigs[stationType]) {
            this.defaultConfigs[stationType] = {
                ...this.defaultConfigs[stationType],
                ...newConfig
            };
            return true;
        }
        return false;
    }

    /**
     * Reset về default config
     */
    resetToDefault(stationType) {
        // Implementation để reset về config gốc
        // Có thể load từ file config hoặc environment variables
        const envConfig = this._loadConfigFromEnvironment(stationType);
        if (envConfig) {
            this.defaultConfigs[stationType] = envConfig;
            return true;
        }
        return false;
    }

    /**
     * Private method: Load config từ environment
     */
    _loadConfigFromEnvironment(stationType) {
        const envPrefix = `${stationType}_`;
        const envConfig = {};

        const configKeys = ['API_URL', 'TIMEOUT', 'RETRY_ATTEMPTS', 'FETCH_INTERVAL'];
        
        configKeys.forEach(key => {
            const envKey = `${envPrefix}${key}`;
            const envValue = process.env[envKey];
            if (envValue) {
                const configKey = key.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                envConfig[configKey] = isNaN(envValue) ? envValue : Number(envValue);
            }
        });

        return Object.keys(envConfig).length > 0 ? envConfig : null;
    }
}

module.exports = new StationConfigService();