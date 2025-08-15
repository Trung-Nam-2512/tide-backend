const LuuluongxaService = require('../services/luuluongxaService');

const getLuuluongxaData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const data = await LuuluongxaService.getData(startDate, endDate);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const fetchAndSaveLuuluongxa = async (req, res) => {
    try {
        const payload = req.body;
        const result = await LuuluongxaService.fetchAndSave(payload);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getLuuluongxaData,
    fetchAndSaveLuuluongxa
};