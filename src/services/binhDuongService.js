const axios = require('axios');
const BinhDuongModel = require('../models/binhDuongModel');
const deepEqual = require('deep-equal'); // Cài thêm: npm install deep-equal để so sánh object

const API_URL_BINH_DUONG = process.env.API_URL_BINH_DUONG || "https://thongtinmoitruong.quantracbinhduong.vn/api/station-auto-logs?stationType=5f55a0292fd98d0011cf5809"; // Thay bằng URL thực tế

const fetchAndSaveData = async () => {
    try {
        const response = await axios.get(API_URL_BINH_DUONG);
        const data = response.data.data;

        if (!data || !Array.isArray(data)) {
            throw new Error('Invalid API response');
        }

        const operations = []; // Chuẩn bị bulk operations

        for (const station of data) {
            const existing = await BinhDuongModel.findOne({ key: station.key });

            if (existing) {
                // Kiểm tra duplicate: Nếu receivedAt không mới hơn hoặc measuringLogs giống hệt, bỏ qua
                const newReceivedAt = new Date(station.receivedAt);
                if (newReceivedAt <= existing.receivedAt && deepEqual(station.measuringLogs, existing.measuringLogs)) {
                    console.log(`Skipped duplicate for station ${station.key}`);
                    continue;
                }
            }

            // Chuẩn bị upsert operation
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
                            receivedAt: new Date(station.receivedAt),
                            measuringLogs: station.measuringLogs
                        }
                    },
                    upsert: true
                }
            });
        }

        if (operations.length > 0) {
            await BinhDuongModel.bulkWrite(operations);
            console.log(`Updated ${operations.length} stations successfully`);
        } else {
            console.log('No new data to update');
        }
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error
            console.error('Duplicate key error handled:', error.message);
        } else {
            console.error('Error fetching/saving Binh Duong data:', error);
        }
        throw error; // Ném lỗi để middleware handle
    }
};

const getAllStations = async () => {
    return await BinhDuongModel.find({}).sort({ receivedAt: -1 });
};

module.exports = { fetchAndSaveData, getAllStations };