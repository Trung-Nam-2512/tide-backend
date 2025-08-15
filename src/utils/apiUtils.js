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
}

module.exports = ApiUtils;
