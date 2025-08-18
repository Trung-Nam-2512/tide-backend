// controllers/triAnController.js
const triAnService = require('../services/triAnService');

const toDate = (s) => {
    if (!s) return null;
    // chấp nhận "YYYY-MM-DD" hoặc ISO; ép về 00:00:00 local
    const d = new Date(s);
    return isNaN(d) ? null : d;
};

function clampRange(start, end, maxDays = 31) {
    // tránh query quá dài (VD do client lỗi); mặc định 31 ngày
    const ms = 24 * 3600 * 1000;
    if (!start || !end) return { start, end };
    const diff = (end - start) / ms;
    if (diff > maxDays) {
        return { start: new Date(end - maxDays * ms), end };
    }
    return { start, end };
}

async function getTriAnChartData(req, res) {
    try {
        const { startDate: s, endDate: e } = req.query;

        let start = toDate(s);
        let end = toDate(e);

        // mặc định 7 ngày gần nhất (nếu thiếu)
        if (!end) end = new Date(); // now
        if (!start) {
            start = new Date(end);
            start.setDate(end.getDate() - 7);
        }

        // chuẩn hoá: set start 00:00, end 23:59:59.999
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // giới hạn khoảng tối đa (ví dụ 31 ngày)
        ({ start, end } = clampRange(start, end, 31));

        const data = await triAnService.getTriAnDataForChart(start, end);
        res.json({
            range: { start: start.toISOString(), end: end.toISOString() },
            count: data.length,
            items: data
        });
    } catch (err) {
        console.error('[TriAn] getTriAnChartData error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = { getTriAnChartData };
