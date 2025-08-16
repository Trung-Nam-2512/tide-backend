const config = {
    mongo: {
        url: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project-water-level-forecast',
    },
    api: {
        tide: {
            apiUrl_forecast: process.env.API_URL_FORECAST || 'https://marinemekong.com/admin/api/station_get',
        },
        tide_ho_dau_tien: {
            apiUrl_forecast: process.env.API_URL_HODAUTIENG || 'https://hodautieng.vn/jaxrs/QuanTracHoChua/getDataQuanTracTB',
        },
        tide_ho_dau_tien_QXA: {
            apiUrl_forecast: process.env.API_URL_HODAUTIENG_QXA || 'https://hodautieng.vn/jaxrs/QuanTracHoChua/getDataQuanTrac',
        },
        mekong: {
            apiUrl_ChauDoc: process.env.API_URL_FORECAST_CHAUDOC || 'https://ffw.mrcmekong.org/fetch_stforecast.php?StCode=CDO',
            apiUrl_Tanchau: process.env.API_URL_FORECAST_TANCHAU || 'https://ffw.mrcmekong.org/fetch_stforecast.php?StCode=TCH',
        },
    }
}

module.exports = config;