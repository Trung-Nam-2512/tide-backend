const cron = require('node-cron');
const { fetchAndSaveAllMekongData, getMekongStats } = require('../services/mekongService');

/**
 * Scheduler để tự động fetch dữ liệu Mekong API mỗi 1 giờ
 * Tương tự như các scheduler khác trong hệ thống
 */

/**
 * Fetch dữ liệu Mekong từ API
 */
const fetchMekongDataScheduled = async () => {
    console.log('🌊 Bắt đầu fetch dữ liệu Mekong theo lịch trình...');
    console.log(`⏰ Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);

    try {
        const result = await fetchAndSaveAllMekongData();

        if (result.success) {
            console.log(`✅ Mekong scheduler: ${result.totalDataPoints || result.dataPoints} records được lưu thành công`);
            console.log(`📊 Kết quả: ${result.successCount}/${result.totalStations} stations thành công`);

            return {
                success: true,
                totalDataPoints: result.totalDataPoints || result.dataPoints,
                successCount: result.successCount,
                totalStations: result.totalStations,
                results: result.results,
                message: result.message,
                timestamp: new Date().toISOString()
            };
        } else {
            console.log(`❌ Mekong scheduler: ${result.message}`);
            return {
                success: false,
                message: result.message,
                error: result.error,
                timestamp: new Date().toISOString()
            };
        }

    } catch (error) {
        console.error('❌ Lỗi trong Mekong scheduler:', error.message);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

/**
 * Khởi tạo Mekong Scheduler
 */
const initMekongScheduler = () => {
    console.log('🚀 Khởi tạo Mekong Data Scheduler...');

    // Lịch trình gọi API: mỗi 1 giờ tại phút thứ 0
    // Cron expression: 0 * * * * (phút giờ ngày tháng thứ)
    const cronExpression = '0 * * * *';

    console.log(`⏰ Lịch trình: ${cronExpression} (mỗi 1 giờ GMT+7)`);
    console.log(`🌊 Dữ liệu: Mekong water level data`);
    console.log(`🔗 API: Sử dụng URL_API_MEKONG từ environment`);

    // Tạo cron job cho việc fetch dữ liệu Mekong
    const mekongJob = cron.schedule(cronExpression, async () => {
        console.log('🔔 Đã đến giờ fetch dữ liệu Mekong!');
        await fetchMekongDataScheduled();
    }, {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh"
    });

    // Fetch dữ liệu ngay lập tức khi khởi động (sau 15 giây)
    // Delay lâu hơn một chút so với các service khác để tránh conflict
    console.log('🚀 Sẽ fetch dữ liệu Mekong sau 15 giây...');
    setTimeout(async () => {
        console.log('🎬 Fetch dữ liệu Mekong lần đầu...');
        await fetchMekongDataScheduled();
    }, 15000); // Delay 15 giây

    console.log('✅ Mekong Data Scheduler đã được khởi tạo thành công!');

    return { mekongJob };
};

/**
 * Dừng Mekong Scheduler
 */
const stopMekongScheduler = (mekongJob) => {
    if (mekongJob) {
        mekongJob.stop();
        console.log('⏹️ Mekong Data Scheduler đã được dừng.');
    }
};

/**
 * Lấy thông tin trạng thái scheduler
 */
const getMekongSchedulerStatus = () => {
    return {
        isRunning: true,
        dataType: 'mekong_water_level',
        schedule: '0 * * * *',
        timezone: 'Asia/Ho_Chi_Minh',
        description: 'Mỗi 1 giờ (0 phút của mỗi giờ) GMT+7',
        apiSource: 'URL_API_MEKONG',
        dataFields: ['date_gmt', 'val', 'ft', 'as', 'av', 'P', 'lineColor'],
        method: 'fetchAndSaveMekongData',
        replaceStrategy: true,
        retryMechanism: 'Built-in exponential backoff (3 attempts)'
    };
};

/**
 * Fetch dữ liệu ngay lập tức (manual trigger)
 */
const fetchMekongDataNow = async () => {
    console.log('🔧 Manual trigger: Fetch dữ liệu Mekong ngay lập tức...');
    return await fetchMekongDataScheduled();
};

/**
 * Lấy thống kê dữ liệu Mekong hiện tại
 */
const getMekongSchedulerStats = async () => {
    try {
        console.log('📊 Đang lấy thống kê Mekong scheduler...');
        const stats = await getMekongStats();

        return {
            success: true,
            stats: stats,
            scheduler: getMekongSchedulerStatus(),
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ Lỗi khi lấy thống kê Mekong scheduler:', error.message);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

/**
 * Kiểm tra health của Mekong scheduler
 */
const checkMekongSchedulerHealth = async () => {
    try {
        const stats = await getMekongStats();
        const status = getMekongSchedulerStatus();

        // Kiểm tra xem có dữ liệu gần đây không (trong 2 giờ qua)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const isDataRecent = stats.dateRange?.to && new Date(stats.dateRange.to) > twoHoursAgo;

        return {
            success: true,
            status: 'healthy',
            scheduler: {
                isRunning: status.isRunning,
                lastScheduleRun: 'N/A', // Cron job không track này
                nextScheduleRun: 'Next hour at minute 0'
            },
            data: {
                totalRecords: stats.totalRecords,
                hasRecentData: isDataRecent,
                lastDataUpdate: stats.lastUpdate,
                dateRange: stats.dateRange
            },
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        return {
            success: false,
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

module.exports = {
    initMekongScheduler,
    stopMekongScheduler,
    getMekongSchedulerStatus,
    fetchMekongDataScheduled,
    fetchMekongDataNow,
    getMekongSchedulerStats,
    checkMekongSchedulerHealth
};
