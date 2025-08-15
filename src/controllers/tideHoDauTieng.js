const MucnuochoService = require('../services/tideHoDauTieng');

const getMucnuochoData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const data = await MucnuochoService.getData(startDate, endDate);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const fetchAndSaveMucnuocho = async (req, res) => {
    try {
        const payload = req.body;
        const result = await MucnuochoService.fetchAndSave(payload);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getMucnuochoData,
    fetchAndSaveMucnuocho
};