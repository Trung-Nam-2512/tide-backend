const cron = require('node-cron');
const BinhDuongServiceV2 = require('../services/binhDuongServiceV2');

const initBinhDuongScheduler = () => {
    // Khởi tạo V2 service
    const serviceV2 = new BinhDuongServiceV2();

    const binhDuongJob = cron.schedule('*/30 * * * *', async () => { // chạy mỗi 30 phút
        console.log(`⏰ Running Binh Duong V2 scheduler at ${new Date().toISOString()}`);
        try {
            const result = await serviceV2.fetchAndSaveData();
            console.log(`✅ V2 Scheduler completed: ${result.stationsUpdated} stations updated`);
        } catch (error) {
            console.error('❌ V2 Scheduler error:', error.message);
        }
    }, {
        scheduled: true,
        timezone: 'Asia/Ho_Chi_Minh'
    });

    console.log('Binh Duong V2 scheduler initialized (every 30 minutes)');
    // fetch dữ liệu sau 15 giây lần đầu tiên
    setTimeout(async () => {
        console.log('⏳ Initial V2 fetch for Binh Duong data after 15 seconds...');
        try {
            const result = await serviceV2.fetchAndSaveData();
            console.log(`✅ Initial V2 fetch completed: ${result.stationsUpdated} stations updated`);
        } catch (error) {
            console.error('❌ Initial V2 fetch error:', error.message);
        }
    }, 15000);
    return { binhDuongJob };
};

module.exports = { initBinhDuongScheduler };