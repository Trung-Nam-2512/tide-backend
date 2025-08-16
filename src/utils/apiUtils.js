const axios = require('axios');
const DateUtils = require('./dateUtils');

/**
 * API utility functions for external service calls
 */
class ApiUtils {
    /**
     * Create request payload for HoDauTieng API
     * @param {Object} data - Request data
     * @param {string} token - API token
     * @returns {Object} Formatted request payload
     */
    static createHoDauTiengPayload(data, token = '') {
        const { tungay, denngay, hc_uuid, mats, tents, namdulieu, namht, cua, mact } = data;

        const payload = {
            data: {
                hc_uuid,
                tents,
                mats,
                tungay: tungay,
                denngay: denngay,
                namdulieu,
                namht
            }
        };

        // Chỉ thêm các trường nếu chúng có giá trị
        if (cua && cua.trim()) payload.data.cua = cua;
        if (mact && mact.trim()) payload.data.mact = mact;
        if (token && token.trim()) payload.token = token;

        return payload;
    }

    /**
     * Make API call to HoDauTieng service with retry mechanism
     * @param {string} apiUrl - API endpoint URL
     * @param {Object} payload - Request payload
     * @param {number} maxRetries - Maximum number of retries (default: 3)
     * @param {number} timeout - Timeout in milliseconds (default: 30000)
     * @returns {Promise<Object>} API response data
     */
    static async callHoDauTiengApi(apiUrl, payload, maxRetries = 3, timeout = 30000) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📡 Making API call to: ${apiUrl} (Attempt ${attempt}/${maxRetries})`);
                if (attempt === 1) {
                    console.log('📋 Request payload:', JSON.stringify(payload, null, 2));
                }

                const response = await axios.post(apiUrl, payload, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: timeout
                });

                console.log(`✅ API call successful on attempt ${attempt}`);
                return response.data;

            } catch (error) {
                lastError = error;
                console.error(`❌ API call failed on attempt ${attempt}/${maxRetries}:`, error.message);

                if (error.response) {
                    console.error('📋 Response status:', error.response.status);
                    console.error('📋 Response data:', error.response.data);

                    // Không retry cho lỗi client (4xx) trừ 408, 429
                    const status = error.response.status;
                    if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
                        console.error('🚫 Client error detected, skipping retries');
                        break;
                    }
                } else if (error.request) {
                    console.error('📋 No response received from server');
                } else {
                    console.error('📋 Request setup error:', error.message);
                }

                // Đợi trước khi thử lại (exponential backoff)
                if (attempt < maxRetries) {
                    const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // 1s, 2s, 4s, max 10s
                    console.log(`⏳ Waiting ${delayMs}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }

        // Tất cả attempts đều thất bại
        console.error(`❌ All ${maxRetries} attempts failed for ${apiUrl}`);

        if (lastError.response) {
            throw new Error(`API Error: ${lastError.response.status} - ${lastError.response.statusText}. Details: ${JSON.stringify(lastError.response.data)}`);
        } else if (lastError.request) {
            throw new Error('API Error: No response received from server after all retries');
        } else {
            throw new Error(`API Error: ${lastError.message}`);
        }
    }

    /**
 * Create request payload specifically for Qden API
 * @param {Object} data - Request data
 * @param {string} token - API token
 * @returns {Object} Formatted request payload for Qden
 */
    static createQdenPayload(data, token = '') {
        const { tungay, denngay, hc_uuid, mats, tents, namdulieu, namht, cua, mact } = data;

        // Qden might need different payload structure
        return {
            data: {
                hc_uuid,
                tents,
                mats: "QDEN", // Force QDEN for flow rate data
                tungay: tungay,
                denngay: denngay,
                namdulieu,
                namht,
                cua: cua || null, // NULL thay vì chuỗi rỗng
                mact: mact || null, // NULL thay vì chuỗi rỗng
            },
            token: token || null // NULL thay vì chuỗi rỗng
        };
    }

    /**
     * Create request payload specifically for Luuluongxa API
     * @param {Object} data - Request data
     * @param {string} token - API token
     * @returns {Object} Formatted request payload for Luuluongxa
     */
    static createLuuluongxaPayload(data, token = '') {
        const { tungay, denngay, hc_uuid, tents, mats, mact, denngaydb, ngayht, nguondb, gioht, tansuat } = data;

        return {
            data: {
                hc_uuid: hc_uuid || "613bbcf5-212e-43c5-9ef8-69016787454f",
                tents: tents || "Tổng lưu lượng ra khỏi hồ",
                mats: "LUULUONGXA",
                mact: mact || "",
                tungay: tungay || new Date().toISOString().split('T')[0],
                denngay: denngay || new Date().toISOString().split('T')[0],
                denngaydb: denngaydb || new Date().toISOString().split('T')[0],
                ngayht: ngayht || new Date().toISOString().split('T')[0],
                nguondb: nguondb || "2",
                gioht: gioht || "00,01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23",
                tansuat: tansuat || 60,
            },
            token: token || ""
        };
    }

    /**
     * Validate API response structure
     * @param {Object} rawData - Raw API response
     * @returns {boolean} True if response is valid
     */
    static validateApiResponse(rawData) {
        // Check for either dtDataTable (HoDauTieng) or dtData (Luuluongxa)
        return rawData && (
            (rawData.dtDataTable && Array.isArray(rawData.dtDataTable) && rawData.dtDataTable.length > 0) ||
            (rawData.dtData && Array.isArray(rawData.dtData) && rawData.dtData.length > 0)
        );
    }

    /**
     * Make API call to Mekong service with retry mechanism
     * @param {string} apiUrl - API endpoint URL
     * @param {number} maxRetries - Maximum number of retries (default: 3)
     * @param {number} timeout - Timeout in milliseconds (default: 30000)
     * @returns {Promise<Array>} API response data
     */
    static async callMekongApi(apiUrl, maxRetries = 3, timeout = 30000) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📡 Calling Mekong API... (Attempt ${attempt}/${maxRetries})`);
                console.log(`🔗 API URL: ${apiUrl}`);

                const response = await axios.get(apiUrl, {
                    headers: {
                        'User-Agent': 'Hydrology-Dashboard/1.0',
                        'Accept': 'application/json'
                    },
                    timeout: timeout
                });

                console.log(`✅ Mekong API call successful on attempt ${attempt}`);
                console.log(`📋 Response status: ${response.status}`);

                return response.data;

            } catch (error) {
                lastError = error;
                console.error(`❌ Mekong API call failed on attempt ${attempt}/${maxRetries}:`, error.message);

                if (error.response) {
                    console.error('📋 Response status:', error.response.status);
                    console.error('📋 Response data:', error.response.data);

                    // Không retry cho lỗi client (4xx) trừ 408, 429
                    const status = error.response.status;
                    if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
                        console.error('🚫 Client error detected, skipping retries');
                        break;
                    }
                }

                // Đợi trước khi thử lại (exponential backoff)
                if (attempt < maxRetries) {
                    const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    console.log(`⏳ Waiting ${delayMs}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }

        // Tất cả attempts đều thất bại
        console.error(`❌ All ${maxRetries} attempts failed for Mekong API`);

        if (lastError.response) {
            throw new Error(`Mekong API Error: ${lastError.response.status} - ${lastError.response.statusText}`);
        } else if (lastError.request) {
            throw new Error('Mekong API Error: No response received from server after all retries');
        } else {
            throw new Error(`Mekong API Error: ${lastError.message}`);
        }
    }

    /**
     * Parse Mekong API string response to array
     * @param {string} rawData - Raw API response string
     * @returns {Array} Parsed array
     */
    static parseMekongApiResponse(rawData) {
        if (typeof rawData !== 'string') {
            console.warn('⚠️ Mekong API response is not a string');
            return null;
        }

        try {
            // Trim whitespace and extract the array part
            const trimmed = rawData.trim();

            // Find the array part (starts with [ and ends with ])
            const startIndex = trimmed.indexOf('[');
            const endIndex = trimmed.lastIndexOf(']');

            if (startIndex === -1 || endIndex === -1) {
                console.error('❌ No array found in response');
                return null;
            }

            let arrayString = trimmed.substring(startIndex, endIndex + 1);

            // Remove trailing comma if exists (before the closing bracket)
            arrayString = arrayString.replace(/,\s*]$/, ']');

            // Convert JavaScript object notation to JSON
            // Replace unquoted keys with quoted keys
            arrayString = arrayString.replace(/(\w+):/g, '"$1":');

            console.log('🔄 Parsing Mekong array string...');
            const parsed = JSON.parse(arrayString);

            console.log(`✅ Successfully parsed ${parsed.length} items from Mekong API`);
            return parsed;

        } catch (error) {
            console.error('❌ Error parsing Mekong API response:', error.message);
            console.error('📋 Raw data sample:', rawData.substring(0, 200));
            return null;
        }
    }

    /**
     * Validate Mekong API response structure
     * @param {Array} rawData - Raw API response
     * @returns {boolean} True if response is valid
     */
    static validateMekongApiResponse(rawData) {
        return rawData && Array.isArray(rawData) && rawData.length > 0;
    }
}

module.exports = ApiUtils;
