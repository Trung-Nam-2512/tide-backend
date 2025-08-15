const moment = require('moment');

/**
 * Date utility functions for handling various date formats and operations
 */
class DateUtils {
    /**
     * Safely format date with multiple format support
     * @param {string|Date} dateInput - Input date
     * @param {string} outputFormat - Desired output format
     * @returns {string} Formatted date string
     */
    static formatDate(dateInput, outputFormat = 'YYYY-MM-DD') {
        const supportedFormats = [
            'YYYY-MM-DD HH:mm:ss',
            'YYYY-M-D H:m:s',
            moment.ISO_8601
        ];

        const momentDate = moment(dateInput, supportedFormats, true);

        if (momentDate.isValid()) {
            return momentDate.format(outputFormat);
        }

        // Fallback to current time if invalid
        console.warn(`Invalid date format received: ${dateInput}, using current time as fallback`);
        return moment().format(outputFormat);
    }

    /**
     * Get date range from array of date objects
     * @param {Array} dataArray - Array of objects with data_thoigian property
     * @returns {Object} Object with start and end dates
     */
    static getDateRange(dataArray) {
        if (!dataArray || dataArray.length === 0) {
            return null;
        }

        const dates = dataArray.map(item => new Date(item.data_thoigian));
        const startTime = new Date(Math.min(...dates));
        const endTime = new Date(Math.max(...dates));

        return {
            start: startTime,
            end: endTime,
            startISO: startTime.toISOString(),
            endISO: endTime.toISOString(),
            totalDays: Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24))
        };
    }

    /**
     * Calculate cutoff date for data retention
     * @param {number} retentionDays - Number of days to retain
     * @returns {Date} Cutoff date
     */
    static getCutoffDate(retentionDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        return cutoffDate;
    }

    /**
     * Get date range for default queries (last N days)
     * @param {number} days - Number of days to look back
     * @returns {Object} Start and end dates
     */
    static getDefaultDateRange(days = 3) {
        const end = new Date();
        const start = new Date(end);
        start.setDate(end.getDate() - days);

        return { start, end };
    }
}

module.exports = DateUtils;
