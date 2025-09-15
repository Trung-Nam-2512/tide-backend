/**
 * Forecast Data Validation Service - Business logic cho validation dữ liệu
 */

class ForecastDataValidationService {
    constructor() {
        this.validationRules = {
            MUCNUOCHO: {
                min: -10,
                max: 50,
                unit: 'm',
                description: 'Mực nước hồ'
            },
            QDEN: {
                min: 0,
                max: 10000,
                unit: 'm³/s',
                description: 'Dòng chảy đến hồ'
            },
            QXA: {
                min: 0,
                max: 5000,
                unit: 'm³/s',
                description: 'Dòng chảy xả'
            },
            RAINFALL: {
                min: 0,
                max: 1000,
                unit: 'mm',
                description: 'Lượng mưa'
            }
        };
    }

    /**
     * Validate một data point
     */
    validateDataPoint(data) {
        const errors = [];
        const warnings = [];

        // Required fields validation
        if (!data.hc_uuid) {
            errors.push('hc_uuid is required');
        }

        if (!data.parameter_type) {
            errors.push('parameter_type is required');
        }

        if (!data.timestamp) {
            errors.push('timestamp is required');
        }

        if (data.value === undefined || data.value === null) {
            errors.push('value is required');
        }

        if (!data.data_source) {
            errors.push('data_source is required');
        }

        // Parameter type validation
        if (data.parameter_type && !this.validationRules[data.parameter_type]) {
            errors.push(`Invalid parameter_type: ${data.parameter_type}`);
        }

        // Data source validation
        const validDataSources = ['realtime', 'forecast', 'manual'];
        if (data.data_source && !validDataSources.includes(data.data_source)) {
            errors.push(`Invalid data_source: ${data.data_source}`);
        }

        // Value range validation
        if (data.parameter_type && data.value !== undefined) {
            const rule = this.validationRules[data.parameter_type];
            if (rule && (data.value < rule.min || data.value > rule.max)) {
                warnings.push(`Value ${data.value}${rule.unit} is outside normal range [${rule.min}-${rule.max}${rule.unit}] for ${rule.description}`);
            }
        }

        // Timestamp validation
        if (data.timestamp) {
            const timestamp = new Date(data.timestamp);
            if (isNaN(timestamp.getTime())) {
                errors.push('Invalid timestamp format');
            } else {
                const now = new Date();
                const futureLimit = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead
                const pastLimit = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year back

                if (timestamp > futureLimit) {
                    warnings.push('Timestamp is too far in the future');
                }

                if (timestamp < pastLimit) {
                    warnings.push('Timestamp is too far in the past');
                }
            }
        }

        // Forecast specific validation
        if (data.data_source === 'forecast') {
            if (data.forecast_horizon !== undefined && data.forecast_horizon < 0) {
                errors.push('forecast_horizon must be non-negative');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate array of data points
     */
    validateDataArray(dataArray) {
        if (!Array.isArray(dataArray)) {
            return {
                isValid: false,
                errors: ['Data must be an array'],
                warnings: [],
                itemResults: []
            };
        }

        const itemResults = dataArray.map((item, index) => {
            const result = this.validateDataPoint(item);
            return {
                index,
                ...result
            };
        });

        const totalErrors = itemResults.reduce((sum, result) => sum + result.errors.length, 0);
        const totalWarnings = itemResults.reduce((sum, result) => sum + result.warnings.length, 0);

        return {
            isValid: totalErrors === 0,
            errors: totalErrors > 0 ? [`${totalErrors} validation errors found`] : [],
            warnings: totalWarnings > 0 ? [`${totalWarnings} validation warnings found`] : [],
            itemResults,
            summary: {
                total: dataArray.length,
                valid: itemResults.filter(r => r.isValid).length,
                invalid: itemResults.filter(r => !r.isValid).length,
                withWarnings: itemResults.filter(r => r.warnings.length > 0).length
            }
        };
    }

    /**
     * Sanitize data point
     */
    sanitizeDataPoint(data) {
        const sanitized = { ...data };

        // Trim string fields
        if (sanitized.hc_uuid) {
            sanitized.hc_uuid = sanitized.hc_uuid.trim();
        }

        if (sanitized.parameter_type) {
            sanitized.parameter_type = sanitized.parameter_type.trim().toUpperCase();
        }

        if (sanitized.data_source) {
            sanitized.data_source = sanitized.data_source.trim().toLowerCase();
        }

        // Convert value to number
        if (sanitized.value !== undefined && sanitized.value !== null) {
            sanitized.value = parseFloat(sanitized.value);
        }

        // Convert timestamp to Date
        if (sanitized.timestamp) {
            sanitized.timestamp = new Date(sanitized.timestamp);
        }

        // Ensure forecast_horizon is number for forecast data
        if (sanitized.data_source === 'forecast' && sanitized.forecast_horizon !== undefined) {
            sanitized.forecast_horizon = parseInt(sanitized.forecast_horizon, 10);
        }

        return sanitized;
    }

    /**
     * Check for duplicate data
     */
    checkDuplicates(dataArray) {
        const seen = new Set();
        const duplicates = [];

        dataArray.forEach((item, index) => {
            const key = `${item.hc_uuid}|${item.parameter_type}|${item.timestamp}|${item.data_source}`;
            
            if (seen.has(key)) {
                duplicates.push({
                    index,
                    key,
                    item
                });
            } else {
                seen.add(key);
            }
        });

        return duplicates;
    }

    /**
     * Get validation rules for a parameter type
     */
    getValidationRules(parameterType) {
        return this.validationRules[parameterType] || null;
    }

    /**
     * Get all supported parameter types
     */
    getSupportedParameterTypes() {
        return Object.keys(this.validationRules);
    }
}

module.exports = new ForecastDataValidationService();