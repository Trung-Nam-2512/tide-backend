const cron = require('node-cron');
const binhDuongService = require('../services/binhDuongService');

const initBinhDuongScheduler = () => {
    const binhDuongJob = cron.schedule('*/30 * * * *', async () => { // chạy mỗi 30 phút
        console.log(`⏰ Running Binh Duong scheduler at ${new Date().toISOString()}`);
        await binhDuongService.fetchAndSaveData();
    }, {
        scheduled: true,
        timezone: 'Asia/Ho_Chi_Minh'
    });

    console.log('Binh Duong scheduler initialized (every hour)');
    // fetch dữ liệu sau 20 giây lần đầu tiên
    setTimeout(async () => {
        console.log('⏳ Initial fetch for Binh Duong data after 15 seconds...');
        await binhDuongService.fetchAndSaveData();
        console.log('✅ Initial fetch completed');
    }, 15000);
    return { binhDuongJob };
};

module.exports = { initBinhDuongScheduler };