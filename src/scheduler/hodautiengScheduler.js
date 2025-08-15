const cron = require('node-cron');
const MucnuochoService = require('../services/tideHoDauTieng');
const QdenService = require('../services/qdenHoDauTiengService');
const LuuluongxaService = require('../services/luuluongxaService');
const { getRetryConfig } = require('../config/retryConfig');

/**
 * Scheduler để tự động fetch dữ liệu Hồ Dầu Tiếng mỗi 1 tiếng
 * Bao gồm: Mực nước hồ, Lưu lượng nước, Lưu lượng xả
 */

/**
 * Tạo payload mặc định cho từng loại dữ liệu
 */
const createDefaultPayloads = () => {
    // Lấy thời gian hiện tại theo múi giờ +7 (Asia/Ho_Chi_Minh)
    const now = new Date();
    const vietnamTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));

    // Hàm format ngày theo định dạng YYYY-M-D H:mm:ss (không padding số 0)
    const formatDateTimeForAPI = (date) => {
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    // endDate là ngày hiện tại 
    const endDateTime = new Date(vietnamTime);
    const endDate = formatDateTimeForAPI(endDateTime);

    // startDate là 3 
    const startDateTime = new Date(vietnamTime);
    startDateTime.setDate(startDateTime.getDate() - 3);
    const startDate = formatDateTimeForAPI(startDateTime);

    // endDate_3days là 3 ngày sau 
    const endDate3DaysDateTime = new Date(vietnamTime);
    endDate3DaysDateTime.setDate(endDate3DaysDateTime.getDate() + 3);
    const endDate_3days = formatDateTimeForAPI(endDate3DaysDateTime);

    console.log(`📅 Khoảng thời gian fetch: ${startDate} đến ${endDate} (GMT+7)`);
    console.log(`📅 Tổng cộng: ${Math.ceil((vietnamTime - startDateTime) / (1000 * 60 * 60 * 24))} ngày`);

    return {
        // Payload cho mực nước hồ (tide)
        tidePayload: {
            data: {
                hc_uuid: "613bbcf5-212e-43c5-9ef8-69016787454f",
                tents: "Mực nước hồ",
                mats: "MUCNUOCHO",
                tungay: startDate,
                denngay: endDate,
                namdulieu: `${vietnamTime.getFullYear()}`,
                namht: vietnamTime.getFullYear(),
                cua: "",
                mact: "613bbcf5-212e-43c5-9ef8-69016787454f"
            },
            token: ""
        },

        // Payload cho lưu lượng nước (qden)
        qdenPayload: {
            data: {
                hc_uuid: "613bbcf5-212e-43c5-9ef8-69016787454f",
                tents: "Dòng chảy đến hồ",
                mats: "QDEN",
                tungay: startDate,
                denngay: endDate,
                namdulieu: `${vietnamTime.getFullYear()}`,
                namht: vietnamTime.getFullYear(),
                cua: "",
                mact: "613bbcf5-212e-43c5-9ef8-69016787454f"
            },
            token: ""
        },

        // Payload cho lưu lượng xả (luuluongxa)
        luuluongxaPayload: {
            data: {
                hc_uuid: "613bbcf5-212e-43c5-9ef8-69016787454f",
                tents: "Tổng lưu lượng ra khỏi hồ",
                mats: "LUULUONGXA",
                mact: "",
                tungay: startDate,
                denngay: endDate,
                denngaydb: endDate_3days, // fix cho tôi + 3 ngày sau.
                ngayht: endDate,
                nguondb: "2",
                gioht: "00,01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23",
                tansuat: 60
            },
            token: ""
        }
    };
};

/**
 * Fetch tất cả dữ liệu Hồ Dầu Tiếng
 */
const fetchAllHoDauTiengData = async () => {
    console.log('🏞️ Bắt đầu fetch dữ liệu Hồ Dầu Tiếng...');
    console.log(`⏰ Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);

    const results = [];
    const payloads = createDefaultPayloads();

    // 1. Fetch mực nước hồ (Tide)
    try {
        console.log('📊 Đang fetch dữ liệu mực nước hồ...');
        const tideResult = await MucnuochoService.fetchAndSave(payloads.tidePayload);

        results.push({
            type: 'mucnuocho',
            success: tideResult.success,
            newRecords: tideResult.newRecords || 0,
            message: tideResult.message || 'Success'
        });

        if (tideResult.success) {
            console.log(`✅ Mực nước hồ: ${tideResult.newRecords} records mới`);
        } else {
            console.log(`❌ Mực nước hồ: ${tideResult.message}`);
        }
    } catch (error) {
        console.error('❌ Lỗi khi fetch mực nước hồ:', error.message);
        results.push({
            type: 'mucnuocho',
            success: false,
            error: error.message
        });
    }

    // 2. Fetch lưu lượng nước (Qden)
    try {
        console.log('💧 Đang fetch dữ liệu lưu lượng nước...');
        const qdenResult = await QdenService.fetchAndSave(payloads.qdenPayload);

        results.push({
            type: 'qden',
            success: qdenResult.success,
            newRecords: qdenResult.newRecords || 0,
            message: qdenResult.message || 'Success'
        });

        if (qdenResult.success) {
            console.log(`✅ Lưu lượng nước: ${qdenResult.newRecords} records mới`);
        } else {
            console.log(`❌ Lưu lượng nước: ${qdenResult.message}`);
        }
    } catch (error) {
        console.error('❌ Lỗi khi fetch lưu lượng nước:', error.message);
        results.push({
            type: 'qden',
            success: false,
            error: error.message
        });
    }

    // 3. Fetch lưu lượng xả (Luuluongxa)
    try {
        console.log('🚰 Đang fetch dữ liệu lưu lượng xả...');
        const luuluongxaResult = await LuuluongxaService.fetchAndSave(payloads.luuluongxaPayload);

        results.push({
            type: 'luuluongxa',
            success: luuluongxaResult.success,
            newRecords: luuluongxaResult.newRecords || 0,
            message: luuluongxaResult.message || 'Success'
        });

        if (luuluongxaResult.success) {
            console.log(`✅ Lưu lượng xả: ${luuluongxaResult.newRecords} records mới`);
        } else {
            console.log(`❌ Lưu lượng xả: ${luuluongxaResult.message}`);
        }
    } catch (error) {
        console.error('❌ Lỗi khi fetch lưu lượng xả:', error.message);
        results.push({
            type: 'luuluongxa',
            success: false,
            error: error.message
        });
    }

    // Tóm tắt kết quả
    console.log('📊 Tóm tắt kết quả fetch Hồ Dầu Tiếng:');
    const successCount = results.filter(r => r.success).length;
    const totalRecords = results.reduce((sum, r) => sum + (r.newRecords || 0), 0);

    results.forEach(result => {
        if (result.success) {
            console.log(`  ✅ ${result.type}: ${result.newRecords} records mới`);
        } else {
            console.log(`  ❌ ${result.type}: ${result.error || result.message}`);
        }
    });

    console.log(`🎯 Tổng kết: ${successCount}/${results.length} thành công, ${totalRecords} records mới`);

    return {
        success: successCount > 0,
        results,
        totalRecords,
        successCount,
        timestamp: new Date().toISOString()
    };
};

/**
 * Khởi tạo HoDauTieng Scheduler
 */
const initHoDauTiengScheduler = () => {
    console.log('🚀 Khởi tạo HoDauTieng Data Scheduler...');

    // Lịch trình gọi API: mỗi 1 tiếng
    // Cron expression: 0 * * * * (phút giờ ngày tháng thứ)
    const cronExpression = '0 * * * *';

    console.log(`⏰ Lịch trình: ${cronExpression} (mỗi 1 tiếng GMT+7)`);
    console.log(`📍 Dữ liệu: Mực nước hồ, Lưu lượng nước, Lưu lượng xả`);

    // Log retry configuration
    const retryConfig = getRetryConfig('hodautieng');
    console.log(`🔄 Retry config: ${retryConfig.maxRetries} attempts, ${retryConfig.timeout}ms timeout`);

    // Tạo cron job cho việc fetch dữ liệu Hồ Dầu Tiếng
    const hodautiengJob = cron.schedule(cronExpression, async () => {
        console.log('🔔 Đã đến giờ fetch dữ liệu Hồ Dầu Tiếng!');
        await fetchAllHoDauTiengData();
    }, {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh"
    });

    // Fetch dữ liệu ngay lập tức khi khởi động (sau 10 giây)
    console.log('🚀 Sẽ fetch dữ liệu Hồ Dầu Tiếng sau 10 giây...');
    setTimeout(async () => {
        console.log('🎬 Fetch dữ liệu Hồ Dầu Tiếng lần đầu...');
        await fetchAllHoDauTiengData();
    }, 10000); // Delay 10 giây để đảm bảo hệ thống đã sẵn sàng

    console.log('✅ HoDauTieng Data Scheduler đã được khởi tạo thành công!');

    return { hodautiengJob };
};

/**
 * Dừng HoDauTieng Scheduler
 */
const stopHoDauTiengScheduler = (hodautiengJob) => {
    if (hodautiengJob) {
        hodautiengJob.stop();
        console.log('⏹️ HoDauTieng Data Scheduler đã được dừng.');
    }
};

/**
 * Lấy thông tin trạng thái scheduler
 */
const getHoDauTiengSchedulerStatus = () => {
    const retryConfig = getRetryConfig('hodautieng');

    return {
        isRunning: true,
        dataTypes: ['mucnuocho', 'qden', 'luuluongxa'],
        schedule: '0 * * * *',
        timezone: 'Asia/Ho_Chi_Minh',
        description: 'Mỗi 1 tiếng (0 phút của mỗi giờ) GMT+7',
        location: 'Hồ Dầu Tiếng',
        uuid: '613bbcf5-212e-43c5-9ef8-69016787454f',
        retryConfig: {
            maxRetries: retryConfig.maxRetries,
            timeout: retryConfig.timeout,
            baseDelay: retryConfig.baseDelay,
            maxDelay: retryConfig.maxDelay,
            description: `Max ${retryConfig.maxRetries} retries, ${retryConfig.timeout}ms timeout, exponential backoff`
        }
    };
};

/**
 * Fetch dữ liệu ngay lập tức (manual trigger)
 */
const fetchHoDauTiengDataNow = async () => {
    console.log('🔧 Manual trigger: Fetch dữ liệu Hồ Dầu Tiếng ngay lập tức...');
    return await fetchAllHoDauTiengData();
};

module.exports = {
    initHoDauTiengScheduler,
    stopHoDauTiengScheduler,
    getHoDauTiengSchedulerStatus,
    fetchAllHoDauTiengData,
    fetchHoDauTiengDataNow
};
