const triAnService = require('../services/triAnService');

const toDate = (s) => {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d) ? null : d;
};

function clampRange(start, end, maxDays = 31) {
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

        const clientProvidedBoth = !!(start && end);

        // Nếu client KHÔNG cung cấp đủ → mặc định 7 ngày gần nhất
        if (!end) end = new Date();
        if (!start) {
            start = new Date(end);
            start.setDate(end.getDate() - 7);
        }

        // Chuẩn hóa về đầu/cuối ngày THEO UTC để ổn định múi giờ
        // (nếu bạn muốn theo local, đổi thành setHours)
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(23, 59, 59, 999);

        // CHỈ clamp khi client KHÔNG cung cấp đủ 2 mốc (tránh bắn nhầm quá dài do FE lỗi)
        if (!clientProvidedBoth) {
            ({ start, end } = clampRange(start, end, 31));
        }

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
