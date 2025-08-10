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
// part data realy api 
/**
 * Helper chuyển đổi dữ liệu API từ định dạng /Date(xxxxx)/ sang thời gian đọc được
 * @param {Array} apiData - Dữ liệu đầu vào từ API
 * @returns {Array} - Danh sách đối tượng với thời gian đã được định dạng
 */

const convertApiData = (apiData) => {
    const formatterVN = new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    return apiData.map(entry => {
        const match = entry.ThoiGian.match(/\/Date\((\d+)\)\//);
        const millis = match ? parseInt(match[1], 10) : null;

        const dateUTC = millis ? new Date(millis) : null;

        const convertedValue = entry.GiaTri * 100; // Chuyển đổi từ mét sang cm (1m = 100cm)
        console.log(`🔄 Chuyển đổi: ${entry.GiaTri}m → ${convertedValue}cm`);

        return {
            GiaTri: convertedValue,
            Timestamp: millis,
            UTC: dateUTC ? dateUTC.toISOString() : null,
            GioVietNam: dateUTC ? formatterVN.format(dateUTC) : null
        };
    });
}

/**
 * Lọc bỏ các giá trị trùng lặp dựa trên timestamp
 * @param {Array} data - Dữ liệu đầu vào đã được convert
 * @returns {Array} - Dữ liệu đã lọc bỏ trùng lặp
 */
const removeDuplicateData = (data) => {
    if (!Array.isArray(data)) {
        return data;
    }

    const uniqueMap = new Map();

    data.forEach(item => {
        if (item && item.Timestamp !== null && item.Timestamp !== undefined) {
            // Sử dụng timestamp làm key để đảm bảo duy nhất
            if (!uniqueMap.has(item.Timestamp)) {
                uniqueMap.set(item.Timestamp, item);
            }
        }
    });

    // Chuyển Map về Array và sắp xếp theo timestamp
    const uniqueData = Array.from(uniqueMap.values());
    return uniqueData.sort((a, b) => a.Timestamp - b.Timestamp);
}


module.exports = {
    parseDateString,
    parseRawData,
    convertApiData,
    removeDuplicateData,
}