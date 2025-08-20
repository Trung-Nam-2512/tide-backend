const express = require('express');
const router = express.Router();
const tideController = require('../controllers/tideController');
const tideRealyController = require('../controllers/tideRealyController');
const { getSchedulerStatus, fetchAllStationsData } = require('../scheduler/tideDataScheduler');
const tideHoDauTiengController = require('../controllers/tideHoDauTieng');
const qdenHoDauTiengController = require('../controllers/qdenHoDauTiengController');
const luuluongxaController = require('../controllers/luuluongxaController');
const mekongController = require('../controllers/mekongController');
const { fetchHoDauTiengDataNow, getHoDauTiengSchedulerStatus } = require('../scheduler/hodautiengScheduler');
const { getTriAnChartData } = require("../controllers/triAnController")
const {
    fetchMekongDataNow,
    getMekongSchedulerStatus,
    getMekongSchedulerStats,
    checkMekongSchedulerHealth
} = require('../scheduler/mekongScheduler');
const binhDuongController = require('../controllers/binhDuongController');


// API v1 routes
router.get('/fetch-tide-forecast-data', tideController.triggerFetchTideData); // lấy dữ liệu từ api
router.get('/get-tide-forecast-data', tideController.getTideData);// lấy dữ liệu từ database
router.get('/get-tide-data-from-now', tideController.getTideDataFromNow); // lấy dữ liệu từ api
router.get('/get-recent-tide-data', tideController.getRecentTideData); // lấy dữ liệu từ database
router.get('/get-locations', tideController.getLocations); // lấy danh sách các trạm
router.get('/health', tideController.healthCheck); // kiểm tra tình trạng server
router.get('/get-tide-realy-data', tideRealyController.getTideRealyController); // lấy dữ liệu thủy triều thực tế từ API (với cache)
router.get('/get-tide-realy-data-db', tideRealyController.getTideRealyFromDBController); // lấy dữ liệu thủy triều thực tế từ database
router.get('/get-tide-realy-data-force', tideRealyController.getTideRealyForceController); // force refresh dữ liệu từ API
router.get('/cache-status', tideRealyController.getCacheStatusController); // xem trạng thái cache
router.post('/update-station-code', tideRealyController.updateStationCodeController); // cập nhật station code vào tideModel
router.get('/get-combined-tide-data', tideController.getCombinedTideData); // lấy cả dữ liệu dự báo và thực đo

// hodautieng - water level data
router.get('/get-tide-ho-dau-tien-data', tideHoDauTiengController.getMucnuochoData); // lấy dữ liệu mực nước hồ
router.post('/fetch-tide-ho-dau-tien-data', tideHoDauTiengController.fetchAndSaveMucnuocho); // fetch và replace toàn bộ dữ liệu mới

// qden - flow rate data  
router.get('/get-qden-data', qdenHoDauTiengController.getQdenData); // lấy dữ liệu lưu lượng nước
router.post('/fetch-qden-data', qdenHoDauTiengController.fetchAndSaveQden); // fetch và replace toàn bộ dữ liệu mới

// luuluongxa - discharge flow data
router.get('/get-luuluongxa-data', luuluongxaController.getLuuluongxaData); // lấy dữ liệu lưu lượng xả
router.post('/fetch-luuluongxa-data', luuluongxaController.fetchAndSaveLuuluongxa); // fetch và replace toàn bộ dữ liệu mới

// mekong - water level data from Mekong API
router.get('/get-mekong-data', mekongController.getMekongDataController); // lấy dữ liệu Mekong từ database
router.post('/fetch-mekong-data', mekongController.fetchMekongData); // fetch và lưu dữ liệu từ Mekong API
router.get('/get-recent-mekong-data', mekongController.getRecentMekongDataController); // lấy dữ liệu Mekong gần nhất
router.get('/get-mekong-stats', mekongController.getMekongStatsController); // lấy thống kê dữ liệu Mekong
router.get('/get-mekong-data-by-color', mekongController.getMekongDataByColor); // lấy dữ liệu theo màu sắc
router.get('/mekong-health', mekongController.mekongHealthCheck); // kiểm tra tình trạng Mekong service
router.delete('/clear-mekong-data', mekongController.clearMekongData); // xóa toàn bộ dữ liệu Mekong (admin only)


// Trị an 
router.get('/get-data-tri-an', getTriAnChartData)

//
// Binh Duong
router.get('/get-station', binhDuongController.getStations); // lấy dữ liệu Binh Duong
router.post('/fetch-triggle-manual', binhDuongController.fetchDataManually); // fetch data thủ công
router.post('/get-binhduong-history', binhDuongController.getStationHistory);

// Scheduler endpoints
router.get('/scheduler-status', (req, res) => { // xem trạng thái của scheduler
    try {
        const status = getSchedulerStatus();
        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get scheduler status',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

router.post('/', async (req, res) => { // gọi lịch thu thập tất cả dữ liệu thủy triều thực tế từ API 
    try {
        const force = req.body.force === true || req.body.force === 'true';
        console.log(`🔄 Manual trigger for scheduled fetch... (force=${force})`);
        const results = await fetchAllStationsData(force);
        res.json({
            success: true,
            data: results,
            message: force ? 'Force fetch completed' : 'Scheduled fetch completed',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to trigger scheduled fetch',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// GET endpoint to trigger fetching real tide data for ALL stations immediately
router.get('/fetch-tide-realy-all', async (req, res) => { // lấy dữ liệu thủy triều Endpoint mới – GET để lấy dữ liệu cho TẤT CẢ trạm ngay lập tức
    try {
        const force = req.query.force === 'true';
        console.log(`🔄 Manual trigger (GET) for fetching real tide data for all stations... (force=${force})`);
        const results = await fetchAllStationsData(force);
        res.json({
            success: true,
            data: results,
            message: force ? 'Fetched tide real data for all stations (force)' : 'Fetched tide real data for all stations',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tide real data for all stations',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Legacy routes for backward compatibility
// router.get('/', tideController.triggerFetchTideData);

// HoDauTieng scheduler status và manual trigger
router.get('/scheduler/hodautieng/status', (req, res) => {
    try {
        const status = getHoDauTiengSchedulerStatus();
        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get HoDauTieng scheduler status',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

router.post('/scheduler/hodautieng/fetch-now', async (req, res) => {
    try {
        const results = await fetchHoDauTiengDataNow();
        res.json({
            success: true,
            message: 'Manual HoDauTieng fetch completed',
            ...results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Manual HoDauTieng fetch failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Mekong scheduler status và manual trigger
router.get('/scheduler/mekong/status', (req, res) => {
    try {
        const status = getMekongSchedulerStatus();
        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get Mekong scheduler status',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

router.post('/scheduler/mekong/fetch-now', async (req, res) => {
    try {
        const results = await fetchMekongDataNow();
        res.json({
            success: true,
            message: 'Manual Mekong fetch completed',
            ...results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Manual Mekong fetch failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

router.get('/scheduler/mekong/stats', async (req, res) => {
    try {
        const stats = await getMekongSchedulerStats();
        res.json({
            success: true,
            message: 'Mekong scheduler stats retrieved',
            ...stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get Mekong scheduler stats',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

router.get('/scheduler/mekong/health', async (req, res) => {
    try {
        const health = await checkMekongSchedulerHealth();
        const statusCode = health.success ? 200 : 503;
        res.status(statusCode).json({
            success: health.success,
            message: 'Mekong scheduler health check completed',
            ...health
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Mekong scheduler health check failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;