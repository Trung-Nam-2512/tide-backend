/**
 * Forecast Scheduler - Tự động đồng bộ dữ liệu dự báo mực nước
 */

const cron = require('node-cron');
const forecastHoDauTiengService = require('../services/forecastHoDauTiengService');
const forecastDataRepository = require('../repositories/forecastDataRepository');

class ForecastScheduler {
    constructor() {
        this.jobs = new Map();
        this.isInitialized = false;
        this.syncInProgress = false;
    }

    /**
     * Khởi tạo scheduler
     */
    async init() {
        if (this.isInitialized) {
            console.log('⚠️ Forecast scheduler already initialized');
            return;
        }

        try {
            console.log('🔄 Initializing forecast scheduler...');

            // Đăng ký các cron jobs
            await this.setupCronJobs();

            // Đăng ký sample stations nếu chưa có
            await this.initializeSampleStations();

            this.isInitialized = true;
            console.log('✅ Forecast scheduler initialized successfully');

        } catch (error) {
            console.error('❌ Error initializing forecast scheduler:', error.message);
            throw error;
        }
    }

    /**
     * Thiết lập các cron jobs
     */
    async setupCronJobs() {
        // Job 1: Sync dữ liệu mỗi giờ (minute 0)
        const hourlySync = cron.schedule('0 * * * *', async () => {
            console.log('🕐 Running hourly forecast data sync...');
            await this.runHourlySync();
        }, {
            scheduled: false,
            timezone: 'Asia/Ho_Chi_Minh'
        });

        // Job 2: Sync dữ liệu mỗi 4 giờ (minute 0, hours 0,4,8,12,16,20)
        const fourHourlySync = cron.schedule('0 */4 * * *', async () => {
            console.log('🕐 Running 4-hourly comprehensive forecast sync...');
            await this.runComprehensiveSync();
        }, {
            scheduled: false,
            timezone: 'Asia/Ho_Chi_Minh'
        });

        // Job 3: Cleanup dữ liệu cũ hàng ngày (02:00 AM)
        const dailyCleanup = cron.schedule('0 2 * * *', async () => {
            console.log('🧹 Running daily data cleanup...');
            await this.runDailyCleanup();
        }, {
            scheduled: false,
            timezone: 'Asia/Ho_Chi_Minh'
        });

        // Job 4: Health check mỗi 30 phút
        const healthCheck = cron.schedule('*/30 * * * *', async () => {
            await this.runHealthCheck();
        }, {
            scheduled: false,
            timezone: 'Asia/Ho_Chi_Minh'
        });

        // Lưu jobs để quản lý
        this.jobs.set('hourlySync', hourlySync);
        this.jobs.set('fourHourlySync', fourHourlySync);
        this.jobs.set('dailyCleanup', dailyCleanup);
        this.jobs.set('healthCheck', healthCheck);

        console.log('✅ Cron jobs configured:');
        console.log('   - Hourly sync: 0 * * * * (every hour)');
        console.log('   - 4-hourly comprehensive sync: 0 */4 * * *');
        console.log('   - Daily cleanup: 0 2 * * * (02:00 AM)');
        console.log('   - Health check: */30 * * * * (every 30 minutes)');
    }

    /**
     * Không cần khởi tạo stations - chỉ có 1 trạm Hồ Dầu Tiếng
     */
    async initializeSampleStations() {
        console.log('✅ Station ready: Hồ Dầu Tiếng (613bbcf5-212e-43c5-9ef8-69016787454f)');
    }

    /**
     * Sync hàng giờ (nhanh)
     */
    async runHourlySync() {
        if (this.syncInProgress) {
            console.log('⚠️ Sync already in progress, skipping hourly sync');
            return;
        }

        try {
            this.syncInProgress = true;
            const startTime = Date.now();

            // Quick sync for Hồ Dầu Tiếng station - MUCNUOCHO only
            const result = await forecastHoDauTiengService.fetchData('MUCNUOCHO');
            
            let successCount = 0;
            let errorCount = 0;
            
            if (result.success) {
                successCount++;
                console.log(`✅ Hourly sync: MUCNUOCHO data updated`);
            } else {
                errorCount++;
                console.error(`❌ Hourly sync failed`);
            }

            const duration = Date.now() - startTime;
            console.log(`✅ Hourly sync completed: ${successCount} success, ${errorCount} errors, ${duration}ms`);

        } catch (error) {
            console.error('❌ Hourly sync failed:', error.message);
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Sync toàn diện mỗi 4 giờ
     */
    async runComprehensiveSync() {
        if (this.syncInProgress) {
            console.log('⚠️ Sync already in progress, skipping comprehensive sync');
            return;
        }

        try {
            this.syncInProgress = true;
            console.log('🔄 Starting comprehensive forecast sync...');

            // Full sync for all parameters
            const result = await forecastHoDauTiengService.fetchAllData();

            console.log(`✅ Comprehensive sync completed: ${result.successful}/${result.successful + result.failed} parameters, ${result.totalRecords} records`);

        } catch (error) {
            console.error('❌ Comprehensive sync failed:', error.message);
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Cleanup dữ liệu cũ hàng ngày
     */
    async runDailyCleanup() {
        try {
            console.log('🧹 Starting daily data cleanup...');

            // Xóa dữ liệu cũ hơn 1 năm (trừ forecast data)  
            const result = await forecastDataRepository.deleteOldData(365);

            console.log(`✅ Daily cleanup completed: ${result.deletedCount || 0} old records removed`);

            // Có thể thêm các cleanup tasks khác:
            // - Compact database
            // - Clean up temp files
            // - Archive old logs

        } catch (error) {
            console.error('❌ Daily cleanup failed:', error.message);
        }
    }

    /**
     * Health check định kỳ
     */
    async runHealthCheck() {
        try {
            // Kiểm tra dữ liệu mới nhất từ Hồ Dầu Tiếng
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
            const recentCount = await forecastDataRepository.count({
                hc_uuid: '613bbcf5-212e-43c5-9ef8-69016787454f',
                timestamp: { $gte: twoHoursAgo }
            });

            if (recentCount > 0) {
                console.log(`💚 Hồ Dầu Tiếng system healthy: ${recentCount} recent records`);
            } else {
                console.warn(`⚠️ Hồ Dầu Tiếng system issues: no recent data`);
            }

        } catch (error) {
            console.error('❌ Health check failed:', error.message);
        }
    }

    /**
     * Bắt đầu tất cả schedulers
     */
    start() {
        if (!this.isInitialized) {
            throw new Error('Scheduler not initialized. Call init() first.');
        }

        console.log('🚀 Starting forecast schedulers...');

        for (const [name, job] of this.jobs) {
            job.start();
            console.log(`✅ Started ${name} scheduler`);
        }

        console.log('✅ All forecast schedulers started');
    }

    /**
     * Dừng tất cả schedulers
     */
    stop() {
        console.log('🛑 Stopping forecast schedulers...');

        for (const [name, job] of this.jobs) {
            job.stop();
            console.log(`✅ Stopped ${name} scheduler`);
        }

        console.log('✅ All forecast schedulers stopped');
    }

    /**
     * Restart tất cả schedulers
     */
    restart() {
        this.stop();
        setTimeout(() => {
            this.start();
        }, 1000);
    }

    /**
     * Lấy trạng thái schedulers
     */
    getStatus() {
        const status = {
            initialized: this.isInitialized,
            syncInProgress: this.syncInProgress,
            jobs: {}
        };

        for (const [name, job] of this.jobs) {
            status.jobs[name] = {
                running: job.running || false,
                scheduled: job.scheduled || false
            };
        }

        return status;
    }

    /**
     * Chạy sync manual (cho testing)
     */
    async runManualSync(type = 'comprehensive') {
        console.log(`🔄 Running manual ${type} sync...`);

        try {
            if (type === 'hourly') {
                await this.runHourlySync();
            } else if (type === 'comprehensive') {
                await this.runComprehensiveSync();
            } else if (type === 'cleanup') {
                await this.runDailyCleanup();
            } else {
                throw new Error(`Unknown sync type: ${type}`);
            }

            console.log(`✅ Manual ${type} sync completed`);
            return { success: true, message: `Manual ${type} sync completed` };

        } catch (error) {
            console.error(`❌ Manual ${type} sync failed:`, error.message);
            return { success: false, error: error.message };
        }
    }
}

// Export singleton instance
const forecastScheduler = new ForecastScheduler();

module.exports = {
    forecastScheduler,
    
    // Convenience functions for integration
    async initForecastScheduler() {
        await forecastScheduler.init();
        forecastScheduler.start();
        return forecastScheduler;
    },

    async stopForecastScheduler() {
        forecastScheduler.stop();
    },

    getForecastSchedulerStatus() {
        return forecastScheduler.getStatus();
    },

    async runManualForecastSync(type) {
        return await forecastScheduler.runManualSync(type);
    }
};