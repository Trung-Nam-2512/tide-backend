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
            
            // Giữ nguyên measuringLogs là Object như API trả về
            const measuringLogs = station.measuringLogs;
            
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
                            'currentData.measuringLogs': measuringLogs
                        },
                        $addToSet: { // Sử dụng addToSet để tránh duplicate
                            history: {
                                timestamp: newReceivedAt,
                                measuringLogs: measuringLogs
                            }
                        }
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

// Hàm lấy lịch sử với structure mới
const getStationHistory = async (key, start, end) => {
    const query = { key };
    
    // Tìm station
    const station = await BinhDuongModel.findOne(query);
    if (!station) {
        throw new Error(`Station with key ${key} not found`);
    }
    
    let history = station.history || [];
    
    // Filter theo thời gian
    if (start || end) {
        history = history.filter(entry => {
            const entryTime = new Date(entry.timestamp);
            if (start && entryTime < new Date(start)) return false;
            if (end && entryTime > new Date(end)) return false;
            return true;
        });
    }
    
    // Chuẩn hóa dữ liệu trả về cho frontend
    const processedHistory = history.map(entry => {
        const result = {
            timestamp: entry.timestamp
        };
        
        // Copy tất cả parameters từ measuringLogs
        if (entry.measuringLogs) {
            Object.entries(entry.measuringLogs).forEach(([paramKey, paramData]) => {
                result[paramKey] = {
                    value: paramData.value,
                    unit: paramData.unit,
                    name: paramData.name, // Tên hiển thị
                    warningLevel: paramData.warningLevel
                };
            });
        }
        
        return result;
    });
    
    return { history: processedHistory };
};

// Hàm lấy metadata của tất cả parameters
const getParametersMetadata = async () => {
    const stations = await BinhDuongModel.find({}).limit(10); // Lấy một số station để analyze
    const parametersMap = new Map();
    
    stations.forEach(station => {
        // Từ currentData
        if (station.currentData?.measuringLogs) {
            Object.entries(station.currentData.measuringLogs).forEach(([paramKey, paramData]) => {
                if (!parametersMap.has(paramKey)) {
                    parametersMap.set(paramKey, {
                        key: paramData.key,
                        name: paramData.name,
                        unit: paramData.unit,
                        maxLimit: paramData.maxLimit,
                        minLimit: paramData.minLimit
                    });
                }
            });
        }
        
        // Từ history
        station.history?.forEach(entry => {
            if (entry.measuringLogs) {
                Object.entries(entry.measuringLogs).forEach(([paramKey, paramData]) => {
                    if (!parametersMap.has(paramKey)) {
                        parametersMap.set(paramKey, {
                            key: paramData.key,
                            name: paramData.name,
                            unit: paramData.unit,
                            maxLimit: paramData.maxLimit,
                            minLimit: paramData.minLimit
                        });
                    }
                });
            }
        });
    });
    
    return Object.fromEntries(parametersMap);
};

// Hàm migration để clean data cũ và thiết lập lại structure
const migrateHistoryData = async () => {
    try {
        // Xóa tất cả history entries cũ có structure sai (chỉ có timestamp)
        const result = await BinhDuongModel.updateMany(
            {},
            {
                $set: {
                    history: [] // Reset history về empty array
                }
            }
        );
        
        console.log(`Migration completed: ${result.modifiedCount} stations updated`);
        return { success: true, modifiedCount: result.modifiedCount };
    } catch (error) {
        console.error('Migration error:', error);
        throw error;
    }
};

module.exports = { fetchAndSaveData, getAllStations, getStationHistory, getParametersMetadata, migrateHistoryData };