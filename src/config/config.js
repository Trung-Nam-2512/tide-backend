const config = {
    mongo: {
        url: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project-water-level-forecast',

    },
    api: {
        tide: {
            apiUrl_forecast: process.env.API_URL_FORECAST || 'https://marinemekong.com/admin/api/station_get',
        }
    }
}

module.exports = config;