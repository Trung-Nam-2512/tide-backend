const express = require('express');
const router = express.Router();
const tideController = require('../controllers/tideController');
const tideRealyController = require('../controllers/tideRealyController');
const { getSchedulerStatus, fetchAllStationsData } = require('../scheduler/tideDataScheduler');

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

// Scheduler endpoints
router.get('/scheduler-status', (req, res) => {
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

router.post('/trigger-scheduled-fetch', async (req, res) => {
    try {
        console.log('🔄 Manual trigger for scheduled fetch...');
        const results = await fetchAllStationsData();
        res.json({
            success: true,
            data: results,
            message: 'Scheduled fetch completed',
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

// Legacy routes for backward compatibility
// router.get('/', tideController.triggerFetchTideData);

module.exports = router;