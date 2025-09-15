/**
 * Rainfall Routes for SWMM Service Integration
 * Provides rainfall data endpoints for hydrology simulation
 */

const express = require('express');
const router = express.Router();

/**
 * @route   GET /api/rainfall-forecast
 * @desc    Get rainfall forecast data for SWMM simulations
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        // Default rainfall data for Vietnamese monsoon conditions
        const defaultRainfallData = {
            timestamp: new Date().toISOString(),
            location: "Ho Chi Minh City",
            forecasts: [
                {
                    time: new Date().toISOString(),
                    rainfall_mm: 30.0,
                    intensity: "moderate"
                },
                {
                    time: new Date(Date.now() + 3600000).toISOString(), // +1 hour
                    rainfall_mm: 25.0,
                    intensity: "light"
                },
                {
                    time: new Date(Date.now() + 7200000).toISOString(), // +2 hours
                    rainfall_mm: 15.0,
                    intensity: "light"
                }
            ],
            source: "emergency_fallback",
            message: "Using emergency fallback rainfall data for SWMM simulation"
        };

        res.status(200).json({
            success: true,
            data: defaultRainfallData
        });
    } catch (error) {
        console.error('Error in rainfall forecast endpoint:', error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: error.message
        });
    }
});

/**
 * @route   GET /api/rainfall-forecast/current
 * @desc    Get current rainfall data
 * @access  Public
 */
router.get('/current', async (req, res) => {
    try {
        const currentRainfall = {
            timestamp: new Date().toISOString(),
            location: "Ho Chi Minh City",
            current_rainfall_mm: 12.5,
            intensity: "light",
            source: "emergency_fallback"
        };

        res.status(200).json({
            success: true,
            data: currentRainfall
        });
    } catch (error) {
        console.error('Error in current rainfall endpoint:', error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: error.message
        });
    }
});

/**
 * @route   GET /api/rainfall-forecast/health
 * @desc    Health check for rainfall service
 * @access  Public
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: "operational",
        service: "rainfall-forecast",
        timestamp: new Date().toISOString()
    });
});

module.exports = router;