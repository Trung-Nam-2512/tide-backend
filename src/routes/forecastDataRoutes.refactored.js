/**
 * Forecast Data Routes - Refactored to follow SOLID principles
 * Single Responsibility: Only handles route definitions and middleware
 * Open/Closed: Easy to add new routes without modifying existing code
 * Dependency Inversion: Depends on abstractions (Controller, Validators)
 */

const express = require('express');
const router = express.Router();
const ForecastDataController = require('../controllers/ForecastDataController');
const { validators } = require('../middleware/validators/forecastValidators');

// Initialize controller
const controller = new ForecastDataController();

// =====================================
// ROUTE DEFINITIONS
// =====================================

/**
 * @route   GET /api/forecast-data/fetch/:parameter?
 * @desc    Fetch dữ liệu dự báo cho parameter cụ thể hoặc tất cả
 * @access  Public
 */
router.get('/fetch/:parameter?', validators.fetchData, controller.fetchData);

/**
 * @route   GET /api/forecast-data/latest/:parameter?
 * @desc    Lấy dữ liệu mới nhất
 * @access  Public
 */
router.get('/latest/:parameter?', validators.latestData, controller.getLatest);

/**
 * @route   GET /api/forecast-data/range/:parameter
 * @desc    Lấy dữ liệu trong khoảng thời gian
 * @access  Public
 */
router.get('/range/:parameter', validators.rangeData, controller.getRange);

/**
 * @route   GET /api/forecast-data/statistics
 * @desc    Lấy thống kê dữ liệu dự báo
 * @access  Public
 */
router.get('/statistics', controller.getStatistics);

/**
 * @route   GET /api/forecast-data/test-scheduler
 * @desc    Test scheduler manually
 * @access  Public
 */
router.get('/test-scheduler', controller.testScheduler);

/**
 * @route   GET /api/forecast-data/health
 * @desc    Health check cho forecast data service
 * @access  Public
 */
router.get('/health', controller.healthCheck);

/**
 * @route   GET /api/forecast-data/
 * @desc    API information
 * @access  Public
 */
router.get('/', controller.getApiInfo);

// =====================================
// ERROR HANDLING
// =====================================

// 404 handler for unknown endpoints
router.use('*', controller.notFound);

module.exports = router;