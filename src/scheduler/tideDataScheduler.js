const cron = require('node-cron');
const { getTideRealy, getTideRealyForce } = require('../services/tideRealyService');
const Tide = require('../models/tideModel');

/**
 * Scheduler để gọi API thủy triều thực tế theo lịch trình cố định
 * Gọi API mỗi 1 giờ với force=true để fetch toàn bộ dữ liệu (GMT+7)
 */

// Danh sách các trạm cần gọi API
const STATIONS = [
    '4EC7BBAF-44E7-4DFA-BAED-4FB1217FBDA8', // Vũng Tàu
    // Thêm các trạm khác nếu cần
];

/**
 * Hàm gọi API cho tất cả các trạm với force=true
 */
const fetchAllStationsData = async (force = false) => {
    console.log('🕐 Bắt đầu lịch trình gọi API thủy triều thực tế...');
    console.log(`⏰ Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
    console.log(`🔥 Force mode: ${force}`);

    const results = [];

    for (const stationCode of STATIONS) {
        try {
            console.log(`📡 Đang gọi API cho trạm: ${stationCode} (force=${force})`);
            const result = force ? await getTideRealyForce(stationCode) : await getTideRealy(stationCode);

            if (result) {
                results.push({
                    stationCode,
                    success: true,
                    source: result.source,
                    newRecords: result.newRecords || 0,
                    totalRecords: result.data?.length || 0
                });
                console.log(`✅ Trạm ${stationCode}: ${result.newRecords} records mới, ${result.data?.length} records tổng`);
            } else {
                results.push({
                    stationCode,
                    success: false,
                    error: 'No data returned'
                });
                console.log(`❌ Trạm ${stationCode}: Không có dữ liệu trả về`);
            }
        } catch (error) {
            console.error(`❌ Lỗi khi gọi API cho trạm ${stationCode}:`, error.message);
            results.push({
                stationCode,
                success: false,
                error: error.message
            });
        }
    }

    console.log('📊 Tóm tắt kết quả:');
    results.forEach(result => {
        if (result.success) {
            console.log(`  ✅ ${result.stationCode}: ${result.newRecords} records mới (${result.source})`);
        } else {
            console.log(`  ❌ ${result.stationCode}: ${result.error}`);
        }
    });

    return results;
};

/**
 * Hàm lấy danh sách trạm từ database
 */
const loadStationsFromDB = async () => {
    try {
        const stations = await Tide.distinct('stationCode');
        if (stations.length > 0) {
            STATIONS.length = 0; // Clear array
            STATIONS.push(...stations);
            console.log(`📋 Đã tải ${stations.length} trạm từ database:`, stations);
        }
    } catch (error) {
        console.error('❌ Lỗi khi tải danh sách trạm từ database:', error.message);
    }
};

/**
 * Khởi tạo scheduler
 */
const initScheduler = () => {
    console.log('🚀 Khởi tạo Tide Data Scheduler...');

    // Tải danh sách trạm từ database
    loadStationsFromDB();

    // Lịch trình gọi API: mỗi 1 giờ (GMT+7) - tương tự Hồ Dầu Tiếng
    // Cron expression: 0 * * * * (phút giờ ngày tháng thứ)
    const cronExpression = '0 * * * *';

    console.log(`⏰ Lịch trình: ${cronExpression} (mỗi 1 giờ GMT+7)`);
    console.log(`🔥 Method: Gọi trực tiếp fetchAllStationsData(force=true)`);

    // Tạo cron job cho việc gọi API với force=true
    const job = cron.schedule(cronExpression, async () => {
        console.log('🔔 Đã đến giờ gọi API tide realy theo lịch trình!');
        await loadStationsFromDB(); // Cập nhật danh sách trạm trước khi gọi API
        await fetchAllStationsData(true); // force=true để luôn fetch mới
    }, {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh"
    });

    // Tạo cron job để cập nhật danh sách trạm mỗi giờ
    const stationUpdateJob = cron.schedule('0 * * * *', async () => {
        console.log('🔄 Cập nhật danh sách trạm từ database...');
        await loadStationsFromDB();
    }, {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh"
    });

    // Gọi API ngay lập tức khi khởi động (sau 10 giây) với force=true
    console.log('🚀 Sẽ fetch dữ liệu tide realy sau 10 giây...');
    setTimeout(async () => {
        console.log('🎬 Fetch dữ liệu tide realy lần đầu với force=true...');
        await loadStationsFromDB();
        await fetchAllStationsData(true); // force=true để luôn fetch mới
    }, 10000); // Delay 10 giây để đảm bảo hệ thống đã sẵn sàng

    console.log('✅ Tide Data Scheduler đã được khởi tạo thành công!');

    return { job, stationUpdateJob };
};

/**
 * Dừng scheduler
 */
const stopScheduler = (job, stationUpdateJob) => {
    if (job) {
        job.stop();
        console.log('⏹️ Tide Data Scheduler đã được dừng.');
    }
    if (stationUpdateJob) {
        stationUpdateJob.stop();
        console.log('⏹️ Station Update Scheduler đã được dừng.');
    }
};

/**
 * Lấy thông tin trạng thái scheduler
 */
const getSchedulerStatus = () => {
    return {
        isRunning: true,
        stations: STATIONS,
        schedule: '0 * * * *',
        timezone: 'Asia/Ho_Chi_Minh',
        description: 'Mỗi 1 giờ GMT+7 - gọi trực tiếp fetchAllStationsData(force=true)',
        method: 'Direct function call',
        force: true
    };
};

module.exports = {
    initScheduler,
    stopScheduler,
    getSchedulerStatus,
    fetchAllStationsData,
    loadStationsFromDB
};
