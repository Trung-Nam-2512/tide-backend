/**
 * Forecast Controller - Simple API for Hồ Dầu Tiếng station only
 */

const forecastHoDauTiengService = require('../services/forecastHoDauTiengService');

// Response helpers
const successResponse = (res, data, message = 'Success') => {
    return res.status(200).json({ success: true, data, message });
};

const errorResponse = (res, error, message = 'Error', statusCode = 500) => {
    return res.status(statusCode).json({ 
        success: false, 
        error: error?.message || error, 
        message 
    });
};

/**
 * POST /api/forecast/fetch-data
 * Fetch data for specific parameter
 */
const fetchData = async (req, res) => {
    try {
        const { parameter = 'MUCNUOCHO' } = req.body;
        
        if (!['MUCNUOCHO', 'QDEN'].includes(parameter)) {
            return errorResponse(res, 'Invalid parameter', 'Validation error', 400);
        }
        
        const result = await forecastHoDauTiengService.fetchData(parameter);
        
        if (result.success) {
            return successResponse(res, result, 'Data fetched successfully');
        } else {
            return errorResponse(res, result.error, 'Failed to fetch data', 500);
        }
        
    } catch (error) {
        return errorResponse(res, error, 'Fetch failed', 500);
    }
};

/**
 * POST /api/forecast/fetch-all
 * Fetch all parameters data
 */
const fetchAllData = async (req, res) => {
    try {
        const result = await forecastHoDauTiengService.fetchAllData();
        return successResponse(res, result, 'All data fetched successfully');
        
    } catch (error) {
        return errorResponse(res, error, 'Fetch all failed', 500);
    }
};

/**
 * GET /api/forecast/station-info
 * Get station information
 */
const getStationInfo = async (req, res) => {
    try {
        const stationInfo = {
            stationId: forecastHoDauTiengService.stationId,
            stationName: 'Hồ Dầu Tiếng',
            parameters: forecastHoDauTiengService.parameters,
            location: {
                latitude: 11.2838,
                longitude: 106.3619,
                province: 'Tây Ninh',
                district: 'Dầu Tiếng'
            }
        };
        
        return successResponse(res, stationInfo, 'Station info retrieved');
        
    } catch (error) {
        return errorResponse(res, error, 'Failed to get station info', 500);
    }
};

module.exports = {
    fetchData,
    fetchAllData,
    getStationInfo
};