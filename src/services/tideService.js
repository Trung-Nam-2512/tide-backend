const axios = require('axios');
const Tide = require('../models/tideModel');
const config = require('../config/config');

/**
 * Parse date string from DD/MM/YYYY HH:mm format to Date object
 * @param {string} dateString - Date string in DD/MM/YYYY HH:mm format
 * @returns {Date} Date object
 */
const parseDateString = (dateString) => {
    if (!dateString || typeof dateString !== 'string') {
        throw new Error('Invalid date string');
    }

    // Convert DD/MM/YYYY HH:mm to YYYY-MM-DD HH:mm
    const parts = dateString.split(' ');
    if (parts.length !== 2) {
        throw new Error(`Invalid date format: ${dateString}`);
    }

    const datePart = parts[0]; // DD/MM/YYYY
    const timePart = parts[1]; // HH:mm

    const dateParts = datePart.split('/');
    if (dateParts.length !== 3) {
        throw new Error(`Invalid date format: ${dateString}`);
    }

    const day = dateParts[0];
    const month = dateParts[1];
    const year = dateParts[2];

    // Create ISO date string
    const isoDateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}:00`;

    const date = new Date(isoDateString);

    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateString}`);
    }

    return date;
};

/**
 * Parse raw data from API response
 * @param {string} rawData - Raw data string from API
 * @returns {object} Parsed data object
 */
const parseRawData = (rawData) => {
    if (!rawData || typeof rawData !== 'string') {
        throw new Error('Invalid raw data');
    }

    try {
        // Replace single quotes with double quotes for JSON parsing
        const jsonString = rawData.replace(/'/g, '"');
        const parsedData = JSON.parse(jsonString);

        // Validate structure
        if (!parsedData.Time || !parsedData.data) {
            throw new Error('Missing Time or data arrays');
        }

        if (!Array.isArray(parsedData.Time) || !Array.isArray(parsedData.data)) {
            throw new Error('Time and data must be arrays');
        }

        if (parsedData.Time.length !== parsedData.data.length) {
            throw new Error('Time and data arrays must have same length');
        }

        return parsedData;

    } catch (error) {
        console.error('Error parsing raw data:', error.message);
        throw new Error(`Failed to parse data: ${error.message}`);
    }
};

/**
 * Lấy dữ liệu thủy triều từ thời điểm hiện tại đến 1 tuần sau
 * @param {string} location - Mã địa điểm
 * @param {Date} startTime - Thời gian bắt đầu (tùy chọn)
 * @param {Date} endTime - Thời gian kết thúc (tùy chọn)
 * @returns {Promise<Array>} Dữ liệu thủy triều
 */
const getTideDataFromNow = async (location, startTime = null, endTime = null) => {
    try {
        // Nếu không có tham số thời gian, sử dụng logic mặc định
        if (!startTime || !endTime) {
            const now = new Date();
            startTime = new Date(now);
            startTime.setMinutes(0, 0, 0); // Đặt phút và giây về 0
            startTime.setHours(startTime.getHours() + 1); // Làm tròn lên đến giờ tiếp theo

            endTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000);
        }

        console.log(`📅 Fetching tide data from ${startTime.toISOString()} to ${endTime.toISOString()}`);

        const data = await Tide.find({
            location: location,
            date: {
                $gte: startTime,
                $lte: endTime
            }
        }).sort('date');

        console.log(`✅ Found ${data.length} tide data records for next week`);

        return data;
    } catch (error) {
        console.error('❌ Error getting tide data from now:', error.message);
        throw error;
    }
};

/**
 * Lấy dữ liệu thủy triều theo khoảng thời gian tùy chỉnh
 * @param {string} location - Mã địa điểm
 * @param {Date} fromDate - Ngày bắt đầu
 * @param {Date} toDate - Ngày kết thúc
 * @returns {Promise<Array>} Dữ liệu thủy triều
 */
const getTideDataByDateRange = async (location, fromDate, toDate) => {
    try {
        console.log(`📅 Fetching tide data from ${fromDate.toISOString()} to ${toDate.toISOString()}`);

        const data = await Tide.find({
            location: location,
            date: {
                $gte: fromDate,
                $lte: toDate
            }
        }).sort('date');

        console.log(`✅ Found ${data.length} tide data records for date range`);

        return data;
    } catch (error) {
        console.error('❌ Error getting tide data by date range:', error.message);
        throw error;
    }
};

/**
 * Lấy dữ liệu thủy triều gần nhất (cập nhật real-time)
 * @param {string} location - Mã địa điểm
 * @param {number} hours - Số giờ gần nhất (mặc định 24 giờ)
 * @returns {Promise<Array>} Dữ liệu thủy triều
 */
const getRecentTideData = async (location, hours = 24) => {
    try {
        const now = new Date();
        const hoursAgo = new Date(now.getTime() - hours * 60 * 60 * 1000);

        console.log(`📅 Fetching recent tide data (last ${hours} hours)`);

        const data = await Tide.find({
            location: location,
            date: {
                $gte: hoursAgo,
                $lte: now
            }
        }).sort('date');

        console.log(`✅ Found ${data.length} recent tide data records`);

        return data;
    } catch (error) {
        console.error('❌ Error getting recent tide data:', error.message);
        throw error;
    }
};

const fetchTideData = async (location) => {
    try {
        console.log(`🌊 Fetching tide data for location: ${location}`);

        const response = await axios.get(`${config.api.tide.apiUrl_forecast}/${location}`, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Hydrology-Dashboard/1.0',
                'Accept': 'application/json'
            }
        });

        console.log('📡 Response status:', response.status);

        // Check for API errors
        if (response.data.message) {
            throw new Error(`API Error: ${response.data.message}`);
        }

        const rawData = response.data.data;
        console.log('📊 Raw data type:', typeof rawData);
        console.log('📏 Raw data length:', rawData ? rawData.length : 'null/undefined');

        if (!rawData) {
            throw new Error('No data received from API');
        }

        // Parse the raw data
        const parsedData = parseRawData(rawData);

        console.log(`✅ Successfully parsed tide data with ${parsedData.Time.length} data points`);
        console.log(`📅 Date range: ${parsedData.Time[0]} to ${parsedData.Time[parsedData.Time.length - 1]}`);
        console.log(`🌊 Tide range: ${Math.min(...parsedData.data)} to ${Math.max(...parsedData.data)}`);

        // Create bulk operations for MongoDB
        const bulkOps = parsedData.Time.map((time, index) => ({
            updateOne: {
                filter: {
                    date: parseDateString(time),
                    location: location
                },
                update: {
                    $set: {
                        tide: parsedData.data[index],
                        location: location,
                        updatedAt: new Date()
                    },
                    $setOnInsert: {
                        date: parseDateString(time),
                        createdAt: new Date()
                    }
                },
                upsert: true,
            }
        }));

        console.log(`📝 Created ${bulkOps.length} bulk operations`);

        // Execute bulk write
        const result = await Tide.bulkWrite(bulkOps);

        console.log(`✅ Successfully saved tide data:`, {
            matched: result.matchedCount,
            modified: result.modifiedCount,
            upserted: result.upsertedCount,
            total: result.matchedCount + result.modifiedCount + result.upsertedCount
        });

        return {
            success: true,
            message: 'Tide data fetched and saved successfully',
            location: location,
            dataPoints: parsedData.Time.length,
            dateRange: {
                start: parsedData.Time[0],
                end: parsedData.Time[parsedData.Time.length - 1]
            },
            tideRange: {
                min: Math.min(...parsedData.data),
                max: Math.max(...parsedData.data)
            }
        };

    } catch (error) {
        console.error('❌ Error fetching tide data:', error.message);

        // Log more details for debugging
        if (error.response) {
            console.error('📡 Response status:', error.response.status);
            console.error('📡 Response data:', error.response.data);
        }

        throw error;
    }
}







module.exports = {
    fetchTideData,
    getTideDataFromNow,
    getTideDataByDateRange,
    getRecentTideData,

}