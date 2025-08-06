const express = require('express');
const router = express.Router();
const tideController = require('../controllers/tideController');

// API v1 routes
router.get('/fetch-tide-forecast-data', tideController.triggerFetchTideData); // lấy dữ liệu từ api
router.get('/get-tide-forecast-data', tideController.getTideData);// lấy dữ liệu từ database
router.get('/get-tide-data-from-now', tideController.getTideDataFromNow); // lấy dữ liệu từ api
router.get('/get-recent-tide-data', tideController.getRecentTideData); // lấy dữ liệu từ database
router.get('/get-locations', tideController.getLocations); // lấy danh sách các trạm
router.get('/health', tideController.healthCheck); // kiểm tra tình trạng server

// Legacy routes for backward compatibility
// router.get('/', tideController.triggerFetchTideData);

module.exports = router;