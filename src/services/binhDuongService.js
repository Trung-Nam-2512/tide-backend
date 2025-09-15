// src/services/binhDuongService.js
const axios = require('axios');
const BinhDuongModel = require('../models/binhDuongModel');

const API_URL = process.env.API_URL_BINH_DUONG || 'https://thongtinmoitruong.quantracbinhduong.vn/api/station-auto-logs?stationType=5f55a0292fd98d0011cf5809'; // Thay bằng URL API thật

const fetchAndSaveData = async () => {
    try {
        const response = await axios.get(API_URL);
        const data = response.data.data;

        if (!data || !Array.isArray(data)) {
            throw new Error('Dữ liệu từ API không hợp lệ');
        }

        const operations = [];

        for (const station of data) {
            const newReceivedAt = new Date(station.receivedAt);
            const historyEntries = Object.entries(station.measuringLogs).map(([key, log]) => ({
                timestamp: newReceivedAt,
                value: log.value,
                unit: log.unit,
                warningLevel: log.warningLevel
            }));

            operations.push({
                updateOne: {
                    filter: { key: station.key },
                    update: {
                        $set: {
                            name: station.name,
                            address: station.address,
                            mapLocation: station.mapLocation,
                            province: station.province,
                            stationType: station.stationType,
                            'currentData.receivedAt': newReceivedAt,
                            'currentData.measuringLogs': station.measuringLogs
                        },
                        $push: { history: { $each: historyEntries } } // Thêm lịch sử
                    },
                    upsert: true
                }
            });
        }

        if (operations.length > 0) {
            await BinhDuongModel.bulkWrite(operations);
            console.log(`Đã cập nhật ${operations.length} trạm với lịch sử`);
        } else {
            console.log('Không có dữ liệu mới để cập nhật');
        }
    } catch (error) {
        console.error('Lỗi khi fetch/saving dữ liệu Bình Dương:', error);
        throw error;
    }
};

const getAllStations = async () => {
    return await BinhDuongModel.find({}).sort({ 'currentData.receivedAt': -1 });
};

// Thêm hàm lấy lịch sử
const getStationHistory = async (key, start, end) => {
    const query = { key };
    // console.log(query)
    if (start) query['history.timestamp'] = { $gte: new Date(start) };
    if (end) query['history.timestamp'] = { ...query['history.timestamp'], $lte: new Date(end) };
    return await BinhDuongModel.findOne(query).select('history');
};

module.exports = { fetchAndSaveData, getAllStations, getStationHistory };