const QdenHoDauTiengService = require('../services/qdenHoDauTiengService');

const getQdenData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const data = await QdenHoDauTiengService.getData(startDate, endDate);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const fetchAndSaveQden = async (req, res) => {
    try {
        const payload = req.body;
        const result = await QdenHoDauTiengService.fetchAndSave(payload);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getQdenData,
    fetchAndSaveQden
};