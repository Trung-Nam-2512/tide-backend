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
module.exports = {
    parseDateString,
    parseRawData
}