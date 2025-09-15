/**
 * SWMM Routes - Clean API endpoints for SWMM model integration
 */

const express = require('express');
const router = express.Router();
const swmmController = require('../controllers/swmmController');

// Model information
router.get('/model-info', swmmController.getModelInfo);

// Connection validation
router.get('/validate-connection', swmmController.validateSwmmConnection);

// Input data preview
router.get('/input-preview', swmmController.getInputDataPreview);

// Forecast simulations
router.post('/forecast', swmmController.runForecast);
router.post('/forecast-detailed', swmmController.runDetailedForecast);

// Complete simulation execution
router.post('/execute-full', swmmController.executeFullSimulation);

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'SWMM Integration API is running',
        service: 'SWMM Integration Service',
        version: '1.0.0',
        endpoints: {
            'GET /model-info': 'Get SWMM model information',
            'GET /validate-connection': 'Validate SWMM service connection',
            'GET /input-preview': 'Preview input data for simulation',
            'POST /forecast': 'Run standard SWMM forecast',
            'POST /forecast-detailed': 'Run detailed SWMM forecast',
            'POST /execute-full': 'Execute complete SWMM simulation'
        },
        timestamp: new Date().toISOString()
    });
});

// Root info
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'SWMM Integration API v1.0.0',
        description: 'Clean API for integrating SWMM hydrological model with 3-day forecast data',
        dataSources: {
            'Hồ Dầu Tiếng': 'Real forecast data (MUCNUOCHO + QDEN)',
            'Vũng Tàu': 'Default tide data (3-day forecast)',
            'Hồ Trị An': 'Default level data (3-day forecast)'
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;