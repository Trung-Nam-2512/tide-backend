// services/triAnService.js
const TriAnData = require('../models/triAnModel');
const { getTriAnData } = require('../utils/triAnScraper');

// helper parse số an toàn
const toNum = (v) => {
    const x = parseFloat((v ?? '').toString().replace(',', '.'));
    return Number.isFinite(x) ? x : 0;
};

async function saveTriAnData() {
    try {
        const raw = await getTriAnData();
        if (!raw) return;

        // làm sạch + fallback sumQx
        const doc = {
            time: new Date(raw.time),
            htl: toNum(raw.htl),
            hdbt: toNum(raw.hdbt),
            hc: toNum(raw.hc),
            qve: toNum(raw.qve),
            qxt: toNum(raw.qxt),
            qxm: toNum(raw.qxm),
            sumQx: toNum(raw.sumQx) || (toNum(raw.qxt) + toNum(raw.qxm)),
            ncxs: toNum(raw.ncxs),
            ncxm: toNum(raw.ncxm),
        };

        // upsert theo time để tránh ghi trùng khi chạy song song
        await TriAnData.updateOne(
            { time: doc.time },
            { $setOnInsert: doc },
            { upsert: true }
        );
    } catch (err) {
        console.error('[TriAn] saveTriAnData error:', err.message);
    }
}

async function getTriAnDataForChart(startDate, endDate) {
    // chuẩn hoá tham số
    let start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : null;

    if (start && isNaN(start)) start = null;
    if (end && isNaN(end)) end = null;

    // nếu chỉ có start -> end = now
    if (start && !end) end = new Date();

    const query = {};
    if (start || end) {
        query.time = {};
        if (start) query.time.$gte = start;
        if (end) query.time.$lte = end;
    }

    // chỉ trả các field cần cho chart
    const projection = {
        time: 1, htl: 1, hdbt: 1, hc: 1,
        qve: 1, qxt: 1, qxm: 1, sumQx: 1,
        ncxs: 1, ncxm: 1,
    };

    return TriAnData.find(query, projection).sort({ time: 1 }).lean().exec();
}

module.exports = { saveTriAnData, getTriAnDataForChart };
