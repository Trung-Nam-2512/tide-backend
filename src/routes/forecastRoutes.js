/**
 * Forecast Routes - Simple API for Hồ Dầu Tiếng station only
 */

const express = require('express');
const router = express.Router();
const forecastController = require('../controllers/forecastController');

// Simple routes for single station
router.post('/fetch-data', forecastController.fetchData);
router.post('/fetch-all', forecastController.fetchAllData);
router.get('/station-info', forecastController.getStationInfo);

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Hồ Dầu Tiếng Forecast API is running',
        station: '613bbcf5-212e-43c5-9ef8-69016787454f',
        parameters: ['MUCNUOCHO', 'QDEN'],
        timestamp: new Date().toISOString()
    });
});

// Root info
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Hồ Dầu Tiếng Forecast API',
        version: '2.0.0',
        endpoints: {
            'POST /fetch-data': 'Fetch specific parameter data',
            'POST /fetch-all': 'Fetch all parameters data',
            'GET /station-info': 'Get station information',
            'GET /health': 'Health check'
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;