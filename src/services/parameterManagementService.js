/**
 * Parameter Management Service - Quản lý parameters của stations
 */

const stationRepository = require('../repositories/stationRepository');
const stationConfigService = require('./stationConfigService');

class ParameterManagementService {
    constructor() {
        this.stationRepository = stationRepository;
        this.configService = stationConfigService;
    }

    /**
     * Tạo station parameter mapping mới
     */
    async createParameterMapping(hcUuid, parameterCode, customConfig = {}) {
        // Validate parameter
        if (!this.configService.isParameterSupported(parameterCode)) {
            throw new Error(`Unsupported parameter: ${parameterCode}`);
        }

        // Lấy station hiện tại
        const station = await this.stationRepository.findByUuid(hcUuid);
        if (!station) {
            throw new Error(`Station not found: ${hcUuid}`);
        }

        // Tạo parameter config
        const parameterInfo = this.configService.getParameterInfo(parameterCode);
        const parameterMapping = {
            parameter_code: parameterCode,
            parameter_name: parameterInfo.name,
            unit: parameterInfo.unit,
            min_value: customConfig.minValue || parameterInfo.minValue,
            max_value: customConfig.maxValue || parameterInfo.maxValue,
            decimal_places: customConfig.decimalPlaces || parameterInfo.decimalPlaces,
            is_active: customConfig.isActive !== undefined ? customConfig.isActive : true,
            field_mappings: customConfig.fieldMappings || parameterInfo.fieldMappings,
            validation_rules: this._createValidationRules(parameterCode, customConfig),
            created_at: new Date()
        };

        return parameterMapping;
    }

    /**
     * Lấy danh sách parameters của station
     */
    async getStationParameters(hcUuid) {
        const station = await this.stationRepository.findByUuid(hcUuid);
        if (!station) {
            throw new Error(`Station not found: ${hcUuid}`);
        }

        // Trong implementation thực tế, parameters sẽ được lưu trong collection riêng
        // Ở đây ta simulate bằng cách return based on station type
        const allParameters = this.configService.getAllSupportedParameters();
        
        // Hồ Dầu Tiếng hỗ trợ MUCNUOCHO và QDEN
        if (station.hc_uuid === '613bbcf5-212e-43c5-9ef8-69016787454f') {
            return allParameters.filter(p => ['MUCNUOCHO', 'QDEN'].includes(p.code));
        }

        // Default: tất cả parameters
        return allParameters;
    }

    /**
     * Kiểm tra station có hỗ trợ parameter không
     */
    async isParameterSupportedByStation(hcUuid, parameterCode) {
        const stationParameters = await this.getStationParameters(hcUuid);
        return stationParameters.some(p => p.code === parameterCode);
    }

    /**
     * Lấy field mappings cho station parameter
     */
    async getStationParameterFieldMappings(hcUuid, parameterCode) {
        const isSupported = await this.isParameterSupportedByStation(hcUuid, parameterCode);
        if (!isSupported) {
            throw new Error(`Parameter ${parameterCode} not supported by station ${hcUuid}`);
        }

        return this.configService.getParameterFieldMappings(parameterCode);
    }

    /**
     * Lấy validation rules cho station parameter
     */
    async getStationParameterValidationRules(hcUuid, parameterCode) {
        const isSupported = await this.isParameterSupportedByStation(hcUuid, parameterCode);
        if (!isSupported) {
            throw new Error(`Parameter ${parameterCode} not supported by station ${hcUuid}`);
        }

        return this.configService.getParameterValidationRules(parameterCode);
    }

    /**
     * Update parameter configuration cho station
     */
    async updateStationParameterConfig(hcUuid, parameterCode, newConfig) {
        const isSupported = await this.isParameterSupportedByStation(hcUuid, parameterCode);
        if (!isSupported) {
            throw new Error(`Parameter ${parameterCode} not supported by station ${hcUuid}`);
        }

        // Validate new config
        const validation = this._validateParameterConfig(parameterCode, newConfig);
        if (!validation.isValid) {
            throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
        }

        // Trong implementation thực tế, sẽ update vào database
        // Ở đây chỉ return success message
        return {
            success: true,
            message: `Parameter ${parameterCode} config updated for station ${hcUuid}`,
            updatedConfig: newConfig
        };
    }

    /**
     * Activate/Deactivate parameter cho station
     */
    async toggleStationParameter(hcUuid, parameterCode, isActive) {
        const isSupported = await this.isParameterSupportedByStation(hcUuid, parameterCode);
        if (!isSupported) {
            throw new Error(`Parameter ${parameterCode} not supported by station ${hcUuid}`);
        }

        // Trong implementation thực tế, sẽ update status trong database
        return {
            success: true,
            message: `Parameter ${parameterCode} ${isActive ? 'activated' : 'deactivated'} for station ${hcUuid}`,
            status: isActive ? 'active' : 'inactive'
        };
    }

    /**
     * Lấy thống kê parameters của stations
     */
    async getParameterStatistics() {
        const allStations = await this.stationRepository.findByStatus('active');
        const allParameters = this.configService.getAllSupportedParameters();

        const stats = {
            totalStations: allStations.length,
            totalParameters: allParameters.length,
            parameterUsage: {},
            stationsByParameter: {}
        };

        // Simulate parameter usage statistics
        allParameters.forEach(param => {
            // Giả định mỗi parameter được sử dụng bởi 60-80% stations
            const usageRate = 0.6 + Math.random() * 0.2;
            const stationCount = Math.floor(allStations.length * usageRate);
            
            stats.parameterUsage[param.code] = {
                name: param.name,
                stationCount,
                usagePercentage: Math.round(usageRate * 100)
            };

            stats.stationsByParameter[param.code] = stationCount;
        });

        return stats;
    }

    /**
     * Tìm stations hỗ trợ parameter cụ thể
     */
    async findStationsByParameter(parameterCode) {
        if (!this.configService.isParameterSupported(parameterCode)) {
            throw new Error(`Unsupported parameter: ${parameterCode}`);
        }

        const allStations = await this.stationRepository.findByStatus('active');
        
        // Trong implementation thực tế, sẽ join với parameter mappings table
        // Ở đây simulate based on station characteristics
        const supportingStations = [];
        
        for (const station of allStations) {
            const isSupported = await this.isParameterSupportedByStation(station.hc_uuid, parameterCode);
            if (isSupported) {
                supportingStations.push({
                    ...station,
                    parameterInfo: this.configService.getParameterInfo(parameterCode)
                });
            }
        }

        return supportingStations;
    }

    /**
     * Bulk update parameters cho nhiều stations
     */
    async bulkUpdateStationParameters(updates) {
        const results = {
            success: [],
            errors: []
        };

        for (const update of updates) {
            try {
                const { hcUuid, parameterCode, config } = update;
                const result = await this.updateStationParameterConfig(hcUuid, parameterCode, config);
                results.success.push({
                    hcUuid,
                    parameterCode,
                    result
                });
            } catch (error) {
                results.errors.push({
                    hcUuid: update.hcUuid,
                    parameterCode: update.parameterCode,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Private methods
     */
    _createValidationRules(parameterCode, customConfig) {
        const baseRules = this.configService.getParameterValidationRules(parameterCode);
        
        return {
            ...baseRules,
            ...customConfig.validationRules,
            required: true,
            type: 'number'
        };
    }

    _validateParameterConfig(parameterCode, config) {
        const errors = [];
        const parameterInfo = this.configService.getParameterInfo(parameterCode);

        if (config.minValue !== undefined && config.minValue > parameterInfo.maxValue) {
            errors.push('Minimum value cannot be greater than maximum value');
        }

        if (config.maxValue !== undefined && config.maxValue < parameterInfo.minValue) {
            errors.push('Maximum value cannot be less than minimum value');
        }

        if (config.decimalPlaces !== undefined && (config.decimalPlaces < 0 || config.decimalPlaces > 6)) {
            errors.push('Decimal places must be between 0 and 6');
        }

        if (config.fieldMappings && !Array.isArray(config.fieldMappings)) {
            errors.push('Field mappings must be an array');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = new ParameterManagementService();