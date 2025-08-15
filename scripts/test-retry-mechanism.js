/**
 * Test script để kiểm tra cơ chế retry của API
 * Chạy: node scripts/test-retry-mechanism.js
 */

const ApiUtils = require('../src/utils/apiUtils');

const testRetryMechanism = async () => {
    console.log('🧪 Test Retry Mechanism for HoDauTieng API');
    console.log('=============================================');

    // Test 1: API call với payload hợp lệ (should succeed)
    console.log('\n1️⃣ Test: Valid API call (should succeed)...');
    try {
        const validPayload = {
            data: {
                hc_uuid: "613bbcf5-212e-43c5-9ef8-69016787454f",
                tents: "Mực nước hồ",
                mats: "MUCNUOCHO",
                tungay: "2025-8-12 15:0:0",
                denngay: "2025-8-15 15:0:0",
                namdulieu: "2025",
                namht: 2025,
                mact: "613bbcf5-212e-43c5-9ef8-69016787454f"
            }
        };

        const validResult = await ApiUtils.callHoDauTiengApi(
            'https://hodautieng.vn/jaxrs/QuanTracHoChua/getDataQuanTracTB',
            validPayload,
            2, // 2 retries for quick test
            15000 // 15s timeout
        );

        console.log('✅ Valid API call succeeded');
        console.log(`📊 Received ${validResult?.dtDataTable?.length || 0} records`);
    } catch (error) {
        console.log('❌ Valid API call failed:', error.message);
    }

    // Test 2: API call với URL sai (should retry and fail)
    console.log('\n2️⃣ Test: Invalid URL (should retry and fail)...');
    try {
        const testPayload = {
            data: {
                hc_uuid: "613bbcf5-212e-43c5-9ef8-69016787454f",
                tents: "Test",
                mats: "TEST"
            }
        };

        await ApiUtils.callHoDauTiengApi(
            'https://hodautieng.vn/jaxrs/invalid-endpoint',
            testPayload,
            2, // 2 retries for quick test
            5000 // 5s timeout
        );

        console.log('❓ Unexpected success for invalid URL');
    } catch (error) {
        console.log('✅ Invalid URL failed as expected:', error.message);
    }

    // Test 3: API call với timeout ngắn (should retry and timeout)
    console.log('\n3️⃣ Test: Short timeout (should retry and timeout)...');
    try {
        const timeoutPayload = {
            data: {
                hc_uuid: "613bbcf5-212e-43c5-9ef8-69016787454f",
                tents: "Timeout test",
                mats: "MUCNUOCHO",
                tungay: "2025-8-12 15:0:0",
                denngay: "2025-8-15 15:0:0",
                namdulieu: "2025",
                namht: 2025
            }
        };

        await ApiUtils.callHoDauTiengApi(
            'https://hodautieng.vn/jaxrs/QuanTracHoChua/getDataQuanTracTB',
            timeoutPayload,
            2, // 2 retries
            100 // Very short timeout (100ms)
        );

        console.log('❓ Unexpected success for timeout test');
    } catch (error) {
        console.log('✅ Timeout test failed as expected:', error.message);
    }

    // Test 4: API call với payload sai format (should not retry 4xx errors)
    console.log('\n4️⃣ Test: Invalid payload format (should fail without retry)...');
    try {
        const invalidPayload = {
            invalid: "payload"
        };

        await ApiUtils.callHoDauTiengApi(
            'https://hodautieng.vn/jaxrs/QuanTracHoChua/getDataQuanTracTB',
            invalidPayload,
            3, // 3 retries
            10000 // 10s timeout
        );

        console.log('❓ Unexpected success for invalid payload');
    } catch (error) {
        console.log('✅ Invalid payload failed as expected:', error.message);
    }

    console.log('\n🎉 Retry mechanism test completed!');
    console.log('=============================================');
    console.log('📋 Summary:');
    console.log('  - Valid API calls should succeed');
    console.log('  - Network errors should retry with exponential backoff');
    console.log('  - Client errors (4xx) should not retry (except 408, 429)');
    console.log('  - Timeouts should retry up to max attempts');
    console.log('  - All retries respect the 30s timeout setting');
};

// Chạy test
testRetryMechanism().catch(console.error);
