/**
 * Forecast Hồ Dầu Tiếng Scheduler - Tự động fetch dữ liệu dự báo mực nước mỗi 1 tiếng
 */

const cron = require('node-cron');
const forecastHoDauTiengService = require('../services/forecastHoDauTiengService');

// =====================================================
// SCHEDULER CONFIGURATION
// =====================================================

/**
 * Khởi tạo scheduler cho dữ liệu dự báo Hồ Dầu Tiếng
 * Chạy mỗi giờ để cập nhật dữ liệu realtime + forecast
 */
function initForecastHoDauTiengScheduler() {
    console.log('🔄 Initializing Forecast Hồ Dầu Tiếng Scheduler...');

    // =====================================================
    // JOB 1: FORECAST DATA SCHEDULER - Mỗi 1 tiếng
    // =====================================================
    
    /**
     * Cron job chạy mỗi giờ (minute 0)
     * Format: phút giờ ngày tháng thứ
     * '0 * * * *' = chạy vào phút 0 của mỗi giờ
     */
    const forecastDataJob = cron.schedule('0 * * * *', async () => {
        console.log('\n🕐 ===== FORECAST HỒ DẦU TIẾNG SCHEDULER =====');
        console.log(`⏰ Thời gian chạy: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
        
        try {
            // Fetch tất cả parameters (MUCNUOCHO + QDEN)
            const result = await forecastHoDauTiengService.fetchAllForecastData();
            
            if (result.successful > 0) {
                console.log('✅ Forecast scheduler completed successfully');
                console.log(`📊 Summary: ${result.successful}/${result.total_parameters} parameters, ${result.total_records} total records`);
                
                // Log chi tiết từng parameter
                for (const [param, details] of Object.entries(result.parameter_results)) {
                    if (details.success) {
                        console.log(`   ✅ ${param}: ${details.dataBreakdown.realtime} realtime + ${details.dataBreakdown.forecast} forecast`);
                    } else {
                        console.log(`   ❌ ${param}: ${details.message}`);
                    }
                }
            } else {
                console.error('❌ All forecast data fetch failed');
                if (result.errors.length > 0) {
                    console.error('Errors:', result.errors);
                }
            }
            
        } catch (error) {
            console.error('❌ Forecast scheduler error:', error.message);
        }
        
        console.log('🏁 ===== END FORECAST SCHEDULER =====\n');
    }, {
        scheduled: false, // Không tự động start, sẽ start manual
        timezone: 'Asia/Ho_Chi_Minh'
    });

    // =====================================================
    // JOB 2: INITIAL DATA FETCH - Chạy ngay khi start
    // =====================================================
    
    const runInitialFetch = async () => {
        console.log('\n🚀 ===== INITIAL FORECAST DATA FETCH =====');
        console.log('🔄 Running initial fetch for forecast data...');
        
        try {
            const result = await forecastHoDauTiengService.fetchAllForecastData();
            
            if (result.successful > 0) {
                console.log('✅ Initial forecast fetch completed');
                console.log(`📊 Initial Summary: ${result.successful}/${result.total_parameters} parameters, ${result.total_records} records`);
            } else {
                console.warn('⚠️ Initial forecast fetch had issues');
                if (result.errors.length > 0) {
                    console.warn('Initial errors:', result.errors);
                }
            }
            
        } catch (error) {
            console.error('❌ Initial forecast fetch error:', error.message);
        }
        
        console.log('🏁 ===== END INITIAL FORECAST FETCH =====\n');
    };

    // =====================================================
    // START SCHEDULERS
    // =====================================================
    
    // Start cron job
    forecastDataJob.start();
    console.log('✅ Forecast Hồ Dầu Tiếng hourly job started (0 * * * *)');
    
    // Chạy initial fetch sau 10 giây
    setTimeout(runInitialFetch, 10000);
    console.log('⏳ Initial forecast fetch scheduled in 10 seconds...');

    // =====================================================
    // RETURN JOB REFERENCES
    // =====================================================
    
    return {
        forecastHoDauTiengJob: forecastDataJob,
        runInitialFetch,
        
        // Utility functions
        async runManualFetch() {
            console.log('🔄 Running manual forecast fetch...');
            return await forecastHoDauTiengService.fetchAllForecastData();
        },
        
        async getSchedulerStatus() {
            return {
                forecastJobRunning: forecastDataJob.running,
                forecastJobScheduled: forecastDataJob.scheduled,
                nextRun: 'Every hour at minute 0',
                timezone: 'Asia/Ho_Chi_Minh'
            };
        },
        
        async getDataStatistics() {
            return await forecastHoDauTiengService.getDataStatistics();
        },
        
        stopScheduler() {
            forecastDataJob.stop();
            console.log('🛑 Forecast Hồ Dầu Tiếng scheduler stopped');
        },
        
        restartScheduler() {
            forecastDataJob.start();
            console.log('🔄 Forecast Hồ Dầu Tiếng scheduler restarted');
        }
    };
}

// =====================================================
// GRACEFUL SHUTDOWN HANDLER
// =====================================================

let schedulerInstance = null;

process.on('SIGINT', () => {
    if (schedulerInstance) {
        console.log('\n🛑 Shutting down Forecast Hồ Dầu Tiếng scheduler...');
        schedulerInstance.stopScheduler();
    }
});

process.on('SIGTERM', () => {
    if (schedulerInstance) {
        console.log('\n🛑 Terminating Forecast Hồ Dầu Tiếng scheduler...');
        schedulerInstance.stopScheduler();
    }
});

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    initForecastHoDauTiengScheduler,
    
    // Export service để có thể gọi trực tiếp nếu cần
    forecastHoDauTiengService,
    
    // Helper function để test scheduler
    async testForecastScheduler() {
        console.log('🧪 Testing forecast scheduler...');
        try {
            const result = await forecastHoDauTiengService.fetchAllForecastData();
            console.log('✅ Test completed:', result);
            return result;
        } catch (error) {
            console.error('❌ Test failed:', error.message);
            throw error;
        }
    }
};