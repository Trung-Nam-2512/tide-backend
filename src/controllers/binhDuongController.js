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

module.exports = { getStations, fetchDataManually };