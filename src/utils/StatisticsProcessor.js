/**
 * Statistics Processor - Handles statistics data processing
 * Follows Single Responsibility Principle
 */

class StatisticsProcessor {
    /**
     * Process raw statistics data
     */
    process(rawStatistics) {
        if (!Array.isArray(rawStatistics)) {
            return {
                formatted: {},
                summary: { total_categories: 0, station_uuid: null }
            };
        }

        const formatted = {};
        
        rawStatistics.forEach(stat => {
            const key = `${stat._id.parameter_type}_${stat._id.data_source}`;
            formatted[key] = this.formatStatItem(stat);
        });

        const summary = this.generateSummary(rawStatistics);

        return { formatted, summary };
    }

    /**
     * Format individual statistic item
     */
    formatStatItem(stat) {
        return {
            parameter_type: stat._id.parameter_type,
            data_source: stat._id.data_source,
            total_records: stat.count,
            latest_timestamp: stat.latest_timestamp,
            earliest_timestamp: stat.earliest_timestamp,
            data_span_hours: this.calculateDataSpanHours(
                stat.earliest_timestamp, 
                stat.latest_timestamp
            )
        };
    }

    /**
     * Calculate data span in hours
     */
    calculateDataSpanHours(earliestTimestamp, latestTimestamp) {
        if (!earliestTimestamp || !latestTimestamp) {
            return 0;
        }

        const earliest = new Date(earliestTimestamp);
        const latest = new Date(latestTimestamp);
        
        return Math.round((latest - earliest) / (1000 * 60 * 60));
    }

    /**
     * Generate summary information
     */
    generateSummary(rawStatistics) {
        return {
            total_categories: rawStatistics.length,
            station_uuid: '613bbcf5-212e-43c5-9ef8-69016787454f',
            parameters: this.extractUniqueParameters(rawStatistics),
            data_sources: this.extractUniqueDataSources(rawStatistics)
        };
    }

    /**
     * Extract unique parameters from statistics
     */
    extractUniqueParameters(rawStatistics) {
        const parameters = new Set();
        rawStatistics.forEach(stat => {
            if (stat._id?.parameter_type) {
                parameters.add(stat._id.parameter_type);
            }
        });
        return Array.from(parameters);
    }

    /**
     * Extract unique data sources from statistics
     */
    extractUniqueDataSources(rawStatistics) {
        const dataSources = new Set();
        rawStatistics.forEach(stat => {
            if (stat._id?.data_source) {
                dataSources.add(stat._id.data_source);
            }
        });
        return Array.from(dataSources);
    }
}

module.exports = StatisticsProcessor;