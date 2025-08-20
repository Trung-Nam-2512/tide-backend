const binhDuongService = require('../services/binhDuongService');

const getStations = async (req, res, next) => {
    try {
        const stations = await binhDuongService.getAllStations();
        res.status(200).json({ success: true, data: stations });
    } catch (error) {
        next(error); // Chuyển lỗi cho middleware
    }
};

const fetchDataManually = async (req, res, next) => {
    try {
        await binhDuongService.fetchAndSaveData();
        res.status(200).json({ success: true, message: 'Binh Duong data fetched and saved' });
    } catch (error) {
        next(error);
    }
};


const getStationHistory = async (req, res, next) => {
    try {
        const { key } = req.query;
        const { start, end } = req.body;

        console.log('Request params:', { key, start, end });

        if (!key) {
            return res.status(400).json({
                success: false,
                message: 'Station key is required'
            });
        }

        if (!start || !end) {
            return res.status(400).json({
                success: false,
                message: 'Start and end dates are required'
            });
        }

        // Validate dates
        const startDate = new Date(start);
        const endDate = new Date(end);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format'
            });
        }

        const history = await binhDuongService.getStationHistory(key, startDate, endDate);

        res.status(200).json({
            success: true,
            data: history,
            metadata: {
                station: key,
                timeRange: {
                    start: startDate,
                    end: endDate
                }
            }
        });
    } catch (error) {
        console.error('Error in getStationHistory:', error);
        next(error);
    }
}

module.exports = { getStations, fetchDataManually, getStationHistory };