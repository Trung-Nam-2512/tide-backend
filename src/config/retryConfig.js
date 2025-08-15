/**
 * Retry configuration for API calls
 */

const retryConfig = {
    // Default retry settings
    default: {
        maxRetries: 3,
        timeout: 30000, // 30 seconds
        baseDelay: 1000, // 1 second
        maxDelay: 10000, // 10 seconds max
        retryableStatuses: [408, 429, 500, 502, 503, 504], // HTTP status codes to retry
        nonRetryableStatuses: [400, 401, 403, 404] // HTTP status codes to NOT retry
    },

    // HoDauTieng API specific settings
    hodautieng: {
        maxRetries: 3,
        timeout: 30000,
        baseDelay: 1000,
        maxDelay: 10000,
        retryableStatuses: [408, 429, 500, 502, 503, 504],
        nonRetryableStatuses: [400, 401, 403, 404]
    },

    // Fast retry for less critical operations
    fast: {
        maxRetries: 2,
        timeout: 15000, // 15 seconds
        baseDelay: 500, // 0.5 second
        maxDelay: 5000, // 5 seconds max
        retryableStatuses: [500, 502, 503, 504],
        nonRetryableStatuses: [400, 401, 403, 404, 408, 429]
    },

    // Aggressive retry for critical operations
    aggressive: {
        maxRetries: 5,
        timeout: 60000, // 1 minute
        baseDelay: 2000, // 2 seconds
        maxDelay: 30000, // 30 seconds max
        retryableStatuses: [408, 429, 500, 502, 503, 504],
        nonRetryableStatuses: [400, 401, 403, 404]
    }
};

/**
 * Get retry configuration by name
 * @param {string} configName - Configuration name
 * @returns {Object} Retry configuration
 */
const getRetryConfig = (configName = 'default') => {
    const config = retryConfig[configName] || retryConfig.default;

    return {
        ...config,
        // Calculate exponential backoff delay
        calculateDelay: (attempt) => {
            const delay = Math.min(
                config.baseDelay * Math.pow(2, attempt - 1),
                config.maxDelay
            );
            // Add jitter (random factor) to prevent thundering herd
            const jitter = Math.random() * 0.3; // 0-30% jitter
            return Math.floor(delay * (1 + jitter));
        },

        // Check if status code should be retried
        shouldRetry: (statusCode) => {
            if (statusCode && config.nonRetryableStatuses.includes(statusCode)) {
                return false;
            }
            if (statusCode && config.retryableStatuses.includes(statusCode)) {
                return true;
            }
            // For network errors (no status code), always retry
            return !statusCode;
        }
    };
};

/**
 * Create a retry wrapper function
 * @param {Function} apiFunction - The API function to wrap
 * @param {string} configName - Retry configuration name
 * @returns {Function} Wrapped function with retry logic
 */
const withRetry = (apiFunction, configName = 'default') => {
    return async (...args) => {
        const config = getRetryConfig(configName);
        let lastError;

        for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
            try {
                return await apiFunction(...args);
            } catch (error) {
                lastError = error;

                const statusCode = error.response?.status;
                const shouldRetry = config.shouldRetry(statusCode);

                if (!shouldRetry || attempt === config.maxRetries) {
                    break;
                }

                const delay = config.calculateDelay(attempt);
                console.log(`⏳ Retrying in ${delay}ms... (attempt ${attempt + 1}/${config.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError;
    };
};

module.exports = {
    retryConfig,
    getRetryConfig,
    withRetry
};
