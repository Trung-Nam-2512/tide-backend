// xử lý các api liên quan đến thủy triều thực tế

const { getTideRealy, getTideRealyForce, getTideRealyFromDB, getCacheStatus, updateStationCode } = require('../services/tideRealyService');


const getTideRealyController = async (req, res) => {
    const { stationcode } = req.query;
    const code = stationcode;
    try {
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'stationCode is required as query parameter'
            });
        }

        const result = await getTideRealy(code);

        if (!result) {
            return res.status(500).json({
                success: false,
                message: 'Không thể lấy dữ liệu từ API hoặc cache'
            });
        }

        res.status(200).json({
            success: true,
            data: result.data,
            source: result.source,
            lastUpdate: result.lastUpdate,
            stationCode: code,
            count: result.data ? result.data.length : 0
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

const getTideRealyFromDBController = async (req, res) => {
    const { stationcode, limit } = req.query;
    const code = stationcode;
    const dataLimit = parseInt(limit) || 100;

    try {
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'stationCode is required as query parameter'
            });
        }

        const tideRealy = await getTideRealyFromDB(code, dataLimit);
        res.status(200).json({
            success: true,
            data: tideRealy,
            count: tideRealy.length,
            stationCode: code
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

const getTideRealyForceController = async (req, res) => {
    const { stationcode } = req.query;
    const code = stationcode;
    try {
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'stationCode is required as query parameter'
            });
        }

        const result = await getTideRealyForce(code);

        if (!result) {
            return res.status(500).json({
                success: false,
                message: 'Không thể force refresh dữ liệu'
            });
        }

        res.status(200).json({
            success: true,
            data: result.data,
            source: result.source,
            lastUpdate: result.lastUpdate,
            stationCode: code,
            count: result.data ? result.data.length : 0
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

const getCacheStatusController = async (req, res) => {
    try {
        const cacheStatus = getCacheStatus();
        res.status(200).json({
            success: true,
            cacheStatus: cacheStatus,
            currentTime: new Date().toISOString(),
            vietnamTime: new Date(Date.now() + (7 * 60 * 60 * 1000)).toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

const updateStationCodeController = async (req, res) => {

    const { location, stationCode } = req.body;
    console.log(location, stationCode);
    if (!location || !stationCode) {
        return res.status(400).json({
            success: false,
            message: 'location and stationCode are required'
        });
    }
    try {
        const result = await updateStationCode(location, stationCode);
        res.status(200).json(result);
        console.log(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

module.exports = {
    getTideRealyController,
    getTideRealyForceController,
    getTideRealyFromDBController,
    getCacheStatusController,
    updateStationCodeController
}

